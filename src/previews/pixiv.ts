import { Discord, On, type ArgsOf, ButtonComponent } from "discordx"
import {
  EmbedBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  type ButtonInteraction
} from "discord.js"
import { convert } from "html-to-text"
import truncate from "truncate"
import Pixiv from "pixiv.ts"

import { baseEmbedJson } from "../utils/ToshinCommand.js"
import { extractUrls } from "../utils/utils.js"
import { log } from "../utils/log.js"

import { Config } from "../utils/Config.js"

const ARTWORK_ID_REGEX = /^\/(?:en\/)?artworks\/(\d+)/

const PixivClient = await Pixiv.default.refreshLogin(
  Config.previews.pixiv.refreshToken
)

type DownloadImageOk = { ok: true; buffer: Buffer; type: string }
type DownloadImageFailed = { ok: false }

@Discord()
export class PixivPreview {
  async downloadImage(
    url: string
  ): Promise<DownloadImageOk | DownloadImageFailed> {
    const logUrl = url.replace("https://", "")
    void log("pixiv", "Downloading image", "log", logUrl)

    const res = await fetch(url, {
      headers: { Referer: "https://www.pixiv.net" }
    })

    if (!res.ok) {
      void log(
        "pixiv",
        "Download failed",
        "error",
        logUrl,
        res.status,
        res.statusText
      )

      return { ok: false }
    }

    void log("pixiv", "Download successful", "log", logUrl)
    return {
      ok: true,
      buffer: Buffer.from(await res.arrayBuffer()),
      type: url.match(/\.(...)$/)?.[1] ?? "png"
    }
  }

  async generatePreviewsFromUrl(targetUrl: URL) {
    if (!targetUrl || targetUrl.host !== "www.pixiv.net") return

    const match = targetUrl.pathname.match(ARTWORK_ID_REGEX)
    if (!match || !match[1]) return

    const artworkId = match[1]
    void log("pixiv", "Processing artwork", "log", artworkId)

    let illust

    try {
      illust = await PixivClient.illust.get(artworkId)
      void log("pixiv", "Fetched artwork metadata", "log", artworkId)
    } catch (error) {
      void log(
        "pixiv",
        "Failed to fetch artwork metadata",
        "error",
        artworkId,
        error
      )
      return
    }

    const imageRes = await this.downloadImage(illust.image_urls.medium)

    if (!imageRes.ok) {
      void log("pixiv", "Failed to download artwork image", "error", artworkId)
      return
    }

    const attachments = []

    attachments.push(
      new AttachmentBuilder(imageRes.buffer, {
        name: `${artworkId}.${imageRes.type}`
      })
    )
    void log("pixiv", "Added image attahcment", "log", artworkId)

    let embed = new EmbedBuilder(baseEmbedJson)
      .setTitle(illust.title)

      .setImage(`attachment://${artworkId}.${imageRes.type}`)
      .setURL(illust.url ?? null)
      .setFooter({
        text: "Pixiv"
      })

    if (illust.caption && illust.caption.length > 0) {
      void log("pixiv", "Adding caption", "log", artworkId)

      embed = embed.setDescription(
        truncate(convert(illust.caption), 100, { ellipsis: " …" })
      )
    }

    const userImageRes = await this.downloadImage(
      illust.user.profile_image_urls.medium
    )

    if (userImageRes.ok) {
      void log("pixiv", "Adding fetched artist image", "log", artworkId)

      attachments.push(
        new AttachmentBuilder(userImageRes.buffer, {
          name: `${illust.user.id}.${userImageRes.type}`
        })
      )
    } else {
      void log("pixiv", "Failed to fetch artist image", "error", artworkId)
    }

    embed = embed.setAuthor({
      name: illust.user.name,
      url: `https://www.pixiv.net/en/users/${illust.user.id}`,
      iconURL: userImageRes.ok
        ? `attachment://${illust.user.id}.${userImageRes.type}`
        : undefined
    })
    void log("pixiv", "Adding artist info", "log", artworkId)

    let button

    if (illust.meta_pages.length > 1) {
      void log("pixiv", "Artwork has >1 pages, adding button", "log", artworkId)
      button = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel(`Download all pages of '${truncate(illust.title, 30)}'`)
        .setCustomId(`pixiv_download__${artworkId}`)
    }

    void log("pixiv", "Generated response", "log", artworkId)

    return { embed, attachments, button }
  }

  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (
      !message.content.match("pixiv") ||
      message.content.startsWith("[pixiv]") ||
      message.attachments.size !== 0
    )
      return

    const urls = extractUrls(message.content)
    const results = (
      await Promise.all(urls.map((url) => this.generatePreviewsFromUrl(url)))
    ).filter((e): e is NonNullable<typeof e> => !!e)

    if (results.length === 0) {
      void log("pixiv", "No results were generated")
      return
    }

    const buttons = results
      .map((e) => e.button)
      .filter((e): e is NonNullable<typeof e> => !!e)

    void log("pixiv", "Responding with results")

    await message.reply({
      embeds: [...results.map((e) => e.embed)],
      files: [...results.map((e) => e.attachments).flat()],
      components:
        buttons.length > 0
          ? [new ActionRowBuilder<ButtonBuilder>().addComponents([...buttons])]
          : undefined
    })
  }

  @ButtonComponent({ id: /^pixiv_download__/ })
  async replyButton(interaction: ButtonInteraction) {
    void log(
      "pixiv",
      "Button: All pages requested",
      "log",
      interaction.user.username,
      interaction.customId
    )

    const artworkId = interaction.customId.match(/(\d+)$/)?.[1]

    if (!artworkId) {
      void log(
        "pixiv",
        "Button: Download all pages artwork ID invalid",
        "error",
        interaction.customId
      )

      return interaction.reply({
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `${Config.emoji}\n\nArtwork ID invalid.`
          )
        ],
        ephemeral: true
      })
    }

    await interaction.deferReply({ ephemeral: true })
    log("pixiv", "Button: reply deferred", "log", artworkId)

    let illust

    try {
      illust = await PixivClient.illust.get(artworkId)
      void log("pixiv", "Button: Fetched artwork metadata", "log", artworkId)
    } catch (error) {
      void log(
        "pixiv",
        "Button: Failed to fetch artwork metadata",
        "error",
        artworkId,
        error
      )
      return
    }

    const files = await Promise.all(
      illust.meta_pages
        .slice(0, 10)
        .map((page) => this.downloadImage(page.image_urls.medium))
    )

    if (files.find((file): file is DownloadImageFailed => file.ok === false)) {
      void log(
        "pixiv",
        "Button: Failed to download gallery",
        "error",
        artworkId
      )

      return interaction.editReply({
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `${Config.emoji}\n\nGallery download failed.`
          )
        ]
      })
    }

    void log("pixiv", "Button: Response generated", "log", artworkId)

    await interaction.editReply({
      content:
        illust.meta_pages.length > 10
          ? `Pages 1-10 of ${illust.meta_pages.length}`
          : undefined,
      files: (files as DownloadImageOk[]).map(
        (e) => new AttachmentBuilder(e.buffer)
      )
    })
  }
}
