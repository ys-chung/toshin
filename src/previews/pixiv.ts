import { Discord, On, type ArgsOf } from "discordx"
import {
  EmbedBuilder,
  AttachmentBuilder
} from "discord.js"
import { convert } from "html-to-text"
import truncate from "truncate"
import Pixiv from "pixiv.ts"
import { fetch } from "fetch-h2"

import { baseEmbedJson } from "../utils/ToshinCommand.js"
import { extractUrls } from "../utils/utils.js"
import { Log } from "../utils/log.js"

import { Config } from "../utils/Config.js"

const ARTWORK_ID_REGEX = /^\/(?:en\/)?artworks\/(\d+)/

const log = new Log("pixiv")

const refreshLogin: typeof Pixiv.default.refreshLogin = Pixiv?.default?.refreshLogin ??
  // @ts-expect-error import discrepancy between node and vite
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  (Pixiv.refreshLogin! as typeof Pixiv.default.refreshLogin)

const PixivClient = await refreshLogin(
  Config.previews.pixiv.refreshToken
)

type DownloadImageOk = { ok: true; buffer: Buffer; type: string }
type DownloadImageFailed = { ok: false }

async function downloadImage(
  url: string
): Promise<DownloadImageOk | DownloadImageFailed> {
  const logUrl = url.replace("https://", "")

  const res = await fetch(url, {
    headers: { Referer: "https://www.pixiv.net" },
    allowForbiddenHeaders: true
  })

  if (!res.ok) {
    void log.error("Image download failed", logUrl, res.status, res.statusText)

    return { ok: false }
  }

  void log.info("Image download successful", logUrl)
  return {
    ok: true,
    buffer: Buffer.from(await res.arrayBuffer()),
    type: url.match(/\.(...)$/)?.[1] ?? "png"
  }
}

export async function generatePreviewsFromUrl(targetUrl: URL) {
  if (!targetUrl || targetUrl.host !== "www.pixiv.net") return

  const match = targetUrl.pathname.match(ARTWORK_ID_REGEX)
  if (!match || !match[1]) return

  const artworkId = match[1]
  void log.info("Processing artwork", artworkId)

  let illust

  try {
    illust = await PixivClient.illust.get(artworkId)
    void log.info("Fetched artwork metadata", artworkId)
  } catch (error) {
    void log.error("Failed to fetch artwork metadata", artworkId, error)
    return
  }

  const imageRes = await downloadImage(illust.image_urls.medium)

  if (!imageRes.ok) {
    void log.error("Failed to download artwork image", artworkId)
    return
  }

  const attachments = []

  attachments.push(
    new AttachmentBuilder(imageRes.buffer, {
      name: `${artworkId}.${imageRes.type}`
    })
  )
  void log.info("Added image attahcment", artworkId)

  let embed = new EmbedBuilder(baseEmbedJson)
    .setTitle(illust.title)

    .setImage(`attachment://${artworkId}.${imageRes.type}`)
    .setURL(illust.url ?? null)
    .setFooter({
      text: "Pixiv"
    })

  if (illust.caption && illust.caption.length > 0) {
    void log.info("Adding caption", artworkId)

    embed = embed.setDescription(
      truncate(convert(illust.caption), 100, { ellipsis: " …" })
    )
  }

  const userImageRes = await downloadImage(
    illust.user.profile_image_urls.medium
  )

  if (userImageRes.ok) {
    void log.info("Adding fetched artist image", artworkId)

    attachments.push(
      new AttachmentBuilder(userImageRes.buffer, {
        name: `${illust.user.id}.${userImageRes.type}`
      })
    )
  } else {
    void log.error("Failed to fetch artist image", artworkId)
  }

  embed = embed.setAuthor({
    name: illust.user.name,
    url: `https://www.pixiv.net/en/users/${illust.user.id}`,
    iconURL: userImageRes.ok
      ? `attachment://${illust.user.id}.${userImageRes.type}`
      : undefined
  })
  void log.info("Adding artist info", artworkId)

  return { embed, attachments }
}

@Discord()
export class PixivPreview {
  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (
      !message.content.match("pixiv") ||
      message.content.startsWith("[pixiv]") ||
      message.attachments.size !== 0
    )
      return

    const urls = extractUrls(message.content).slice(0, 5)
    const results = (
      await Promise.all(urls.map((url) => generatePreviewsFromUrl(url)))
    ).filter((e): e is NonNullable<typeof e> => !!e)

    if (results.length === 0) {
      void log.info("No results were generated")
      return
    }

    void log.info("Responding with results")

    await message.reply({
      embeds: [...results.map((e) => e.embed)],
      files: [...results.flatMap((e) => e.attachments)]
    })
  }
}
