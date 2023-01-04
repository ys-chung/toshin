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
    void log("pixiv", `Downloading image '${logUrl}'`)

    const res = await fetch(url, {
      headers: { Referer: "https://www.pixiv.net" }
    })

    if (!res.ok) {
      void log(
        "pixiv",
        `Download '${logUrl}' failed, status: ${res.status} ${res.statusText}`,
        "error"
      )

      return { ok: false }
    }

    void log("pixiv", `Download '${logUrl}' successful`)
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
    void log("pixiv", `Processing artwork ${artworkId}`)

    let illust

    try {
      illust = await PixivClient.illust.get(artworkId)
      void log("pixiv", `Artwork ${artworkId} metadata fetched`)
    } catch (error) {
      void log("pixiv", `Fetch artwork ${artworkId} metadata failed`, "error")
      console.error(error)
      return
    }

    const imageRes = await this.downloadImage(illust.image_urls.medium)

    if (!imageRes.ok) {
      void log(
        "pixiv",
        `Download image for pixiv ${artworkId} failed!`,
        "error"
      )
      return
    }

    const attachments = []

    attachments.push(
      new AttachmentBuilder(imageRes.buffer, {
        name: `${artworkId}.${imageRes.type}`
      })
    )
    void log("pixiv", `Added image attahcment for ${artworkId}`)

    let embed = new EmbedBuilder(baseEmbedJson)
      .setTitle(illust.title)

      .setImage(`attachment://${artworkId}.${imageRes.type}`)
      .setURL(illust.url ?? null)
      .setFooter({
        text: "Pixiv"
      })

    if (illust.caption)
      void log("pixiv", `Caption exists, adding to ${artworkId}`)

    embed = embed.setDescription(
      truncate(convert(illust.caption), 100, { ellipsis: " …" })
    )

    const userImageRes = await this.downloadImage(
      illust.user.profile_image_urls.medium
    )

    if (userImageRes.ok) {
      void log("pixiv", `Artist image fetched, adding to ${artworkId}`)

      attachments.push(
        new AttachmentBuilder(userImageRes.buffer, {
          name: `${illust.user.id}.${userImageRes.type}`
        })
      )
    } else {
      void log(
        "pixiv",
        `Download user image for pixiv user ${illust.user.id} failed!`,
        "error"
      )
    }

    embed = embed.setAuthor({
      name: illust.user.name,
      url: `https://www.pixiv.net/en/users/${illust.user.id}`,
      iconURL: userImageRes.ok
        ? `attachment://${illust.user.id}.${userImageRes.type}`
        : undefined
    })
    void log("pixiv", `Artist info fetched, adding to ${artworkId}`)

    const button =
      illust.meta_pages.length > 1
        ? new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`Download all pages of '${truncate(illust.title, 30)}'`)
            .setCustomId(`pixiv_download__${artworkId}`)
        : undefined
    if (illust.meta_pages.length > 1)
      void log("pixiv", `Artwork has >1 pages, adding button to ${artworkId}`)

    void log("pixiv", `Response to ${artworkId} generated`)

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
    void log("pixiv", `Button: Requested by ${interaction.user.username}`)

    const artworkId = interaction.customId.match(/(\d+)$/)?.[1]

    if (!artworkId) {
      void log(
        "pixiv",
        "Button: Download all pages artwork ID invalid",
        "error"
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

    let illust

    try {
      illust = await PixivClient.illust.get(artworkId)
      void log("pixiv", `Button: Artwork ${artworkId} metadata fetched`)
    } catch (error) {
      void log(
        "pixiv",
        `Button: Fetch artwork ${artworkId} metadata failed`,
        "error"
      )
      console.error(error)
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
        `Button: Artwork ${artworkId} gallery download failed`,
        "error"
      )

      return interaction.reply({
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `${Config.emoji}\n\nGallery download failed.`
          )
        ],
        ephemeral: true
      })
    }

    void log("pixiv", "Button: Response generated")

    await interaction.reply({
      content:
        illust.meta_pages.length > 10
          ? `Pages 1-10 of ${illust.meta_pages.length}`
          : undefined,
      files: (files as DownloadImageOk[]).map(
        (e) => new AttachmentBuilder(e.buffer)
      ),
      ephemeral: true
    })
  }
}
