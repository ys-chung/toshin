import { Discord, On, type ArgsOf } from "discordx"
import { EmbedBuilder } from "discord.js"
import Pixiv from "pixiv.ts"

import { baseEmbed } from "../utils/ToshinCommand.js"
import { extractUrls } from "../utils/extractUrls.js"

import { Config } from "../utils/Config.js"

const ARTWORK_ID_REGEX = /^\/(?:en\/)?artworks\/(\d+)/

const PixivClient = await Pixiv.default.refreshLogin(
  Config.previews.pixiv.refreshToken
)

@Discord()
export class PixivPreview {
  async generateEmbedsFromUrl(targetUrl: URL) {
    if (!targetUrl || targetUrl.host !== "www.pixiv.net") return

    const match = targetUrl.pathname.match(ARTWORK_ID_REGEX)
    if (!match || !match[1]) return

    const artworkId = match[1]

    const illust = await PixivClient.illust.get(artworkId)

    return new EmbedBuilder(baseEmbed.toJSON())
      .setTitle(illust.title)
      .setAuthor({
        name: illust.user.name,
        url: `https://www.pixiv.net/en/users/${illust.user.id}`,
        iconURL: illust.user.profile_image_urls.medium.replace(
          "pximg.net",
          "pixiv.cat"
        )
      })
      .setDescription(illust.caption)
      .setImage(
        (illust.image_urls.large ?? illust.image_urls.medium).replace(
          "pximg.net",
          "pixiv.cat"
        )
      )
      .setURL(illust.url ?? null)
  }

  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (!message.content.match("pixiv") || message.attachments.size !== 0)
      return

    const urls = extractUrls(message.content)
    const embeds = (
      await Promise.all(urls.map((url) => this.generateEmbedsFromUrl(url)))
    ).filter((e): e is EmbedBuilder => !!e)

    console.log(embeds)

    if (embeds.length === 0) return

    await message.reply({
      embeds
    })
  }
}
