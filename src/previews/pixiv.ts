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
    const res = await fetch(url, {
      headers: { Referer: "https://www.pixiv.net" }
    })

    if (!res.ok) return { ok: false }

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

    const illust = await PixivClient.illust.get(artworkId)

    const imageRes = await this.downloadImage(
      illust.image_urls.large ?? illust.image_urls.medium
    )

    if (!imageRes.ok) {
      console.error(`Download image for pixiv ${artworkId} failed!`)
      return
    }

    const attachments = []

    attachments.push(
      new AttachmentBuilder(imageRes.buffer, {
        name: `${artworkId}.${imageRes.type}`
      })
    )

    let embed = new EmbedBuilder(baseEmbedJson)
      .setTitle(illust.title)

      .setImage(`attachment://${artworkId}.${imageRes.type}`)
      .setURL(illust.url ?? null)
      .setFooter({
        text: "Pixiv"
      })

    if (illust.caption)
      embed = embed.setDescription(truncate(convert(illust.caption), 100))

    const userImageRes = await this.downloadImage(
      illust.user.profile_image_urls.medium
    )

    if (userImageRes.ok) {
      attachments.push(
        new AttachmentBuilder(userImageRes.buffer, {
          name: `${illust.user.id}.${userImageRes.type}`
        })
      )
    } else {
      console.error(
        `Download user image for pixiv user ${illust.user.id} failed!`
      )
    }

    embed = embed.setAuthor({
      name: illust.user.name,
      url: `https://www.pixiv.net/en/users/${illust.user.id}`,
      iconURL: userImageRes.ok
        ? `attachment://${illust.user.id}.${userImageRes.type}`
        : undefined
    })

    const button =
      illust.meta_pages.length > 1
        ? new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`Download all pages of '${truncate(illust.title, 30)}'`)
            .setCustomId(`pixiv_download__${artworkId}`)
        : undefined

    return { embed, attachments, button }
  }

  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (!message.content.match("pixiv") || message.attachments.size !== 0)
      return

    const urls = extractUrls(message.content)
    const results = (
      await Promise.all(urls.map((url) => this.generatePreviewsFromUrl(url)))
    ).filter((e): e is NonNullable<typeof e> => !!e)

    if (results.length === 0) return

    const buttons = results
      .map((e) => e.button)
      .filter((e): e is NonNullable<typeof e> => !!e)

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
    const artworkId = interaction.customId.match(/(\d+)$/)?.[1]

    if (!artworkId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `${Config.emoji}\n\nArtwork ID invalid.`
          )
        ],
        ephemeral: true
      })
    }

    const illust = await PixivClient.illust.get(artworkId)

    const files = await Promise.all(
      illust.meta_pages
        .slice(0, 10)
        .map((page) =>
          this.downloadImage(page.image_urls.large ?? page.image_urls.medium)
        )
    )

    if (files.find((file): file is DownloadImageFailed => file.ok === false)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `${Config.emoji}\n\nGallery download failed.`
          )
        ],
        ephemeral: true
      })
    }

    await interaction.reply({
      content:
        illust.meta_pages.length > 10
          ? `1-10 of ${illust.meta_pages.length}`
          : undefined,
      files: (files as DownloadImageOk[]).map(
        (e) => new AttachmentBuilder(e.buffer)
      )
    })

    await interaction.message.edit({ components: [] })
  }
}
