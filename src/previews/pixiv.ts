import { Discord, On, type ArgsOf } from "discordx"
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
  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (!message.content.match("pixiv") || message.attachments.size !== 0)
      return

    const urls = extractUrls(message.content)
    const targetUrl = urls[0]

    if (!targetUrl || targetUrl.host !== "www.pixiv.net") return

    const match = targetUrl.pathname.match(ARTWORK_ID_REGEX)
    if (!match || !match[1]) return

    const artworkId = match[1]

    const illust = await PixivClient.illust.get(artworkId)

    const replyEmbed = baseEmbed
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

    await message.reply({
      embeds: [replyEmbed]
    })
  }
}
