import { Discord, On, type ArgsOf } from "discordx"
import { EmbedBuilder, escapeMarkdown, AttachmentBuilder } from "discord.js"
import { NodeHtmlMarkdown } from "node-html-markdown"
import Pixiv from "pixiv.ts"

import { baseEmbedJson } from "../utils/ToshinCommand.js"
import { extractUrls } from "../utils/utils.js"

import { Config } from "../utils/Config.js"

const ARTWORK_ID_REGEX = /^\/(?:en\/)?artworks\/(\d+)/

const PixivClient = await Pixiv.default.refreshLogin(
  Config.previews.pixiv.refreshToken
)

@Discord()
export class PixivPreview {
  NodeHtmlMarkdown = new NodeHtmlMarkdown()

  async downloadImage(
    url: string
  ): Promise<{ ok: false } | { ok: true; buffer: Buffer }> {
    const res = await fetch(url, {
      headers: { Referer: "https://www.pixiv.net" }
    })

    if (!res.ok) return { ok: false }

    return { ok: true, buffer: Buffer.from(await res.arrayBuffer()) }
  }

  async generateEmbedsFromUrl(targetUrl: URL) {
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

    const attachment = new AttachmentBuilder(imageRes.buffer, {
      name: `${artworkId}.png`
    })

    const embed = new EmbedBuilder(baseEmbedJson)
      .setTitle(illust.title)
      .setAuthor({
        name: illust.user.name,
        url: `https://www.pixiv.net/en/users/${illust.user.id}`,
        iconURL: illust.user.profile_image_urls.medium.replace(
          "pximg.net",
          "pixiv.cat"
        )
      })
      .setImage(`attachment://${artworkId}.png`)
      .setURL(illust.url ?? null)
      .setFooter({
        text: "Pixiv"
      })

    if (illust.caption)
      return embed.setDescription(
        this.NodeHtmlMarkdown.translate(escapeMarkdown(illust.caption))
      )

    return [embed, attachment]
  }

  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (!message.content.match("pixiv") || message.attachments.size !== 0)
      return

    const urls = extractUrls(message.content)
    const results = (
      await Promise.all(urls.map((url) => this.generateEmbedsFromUrl(url)))
    ).filter((e): e is [EmbedBuilder, AttachmentBuilder] => !!e)

    if (results.length === 0) return

    await message.reply({
      embeds: [...results.map((e) => e[0])],
      files: [...results.map((e) => e[1])]
    })
  }
}
