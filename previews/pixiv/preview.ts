import {
  type Message,
  type OmitPartialGroupDMChannel,
  AttachmentBuilder
} from "discord.js"
import Pixiv from "pixiv.ts"
import truncate from "truncate"
import { convert } from "html-to-text"

import { Config } from "../../util/Config"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"

const log = console

const PixivClient = await Pixiv.refreshLogin(Config.pixiv.refreshToken)

const ARTWORK_ID_REGEX = /^\/(?:en\/)?artworks\/(\d+)/

function extractUrl(input: string) {
  const inputArr = input.split(/[ \n]/g)

  for (const input of inputArr) {
    if (URL.canParse(input)) {
      return new URL(input)
    }
  }

  return null
}

type DownloadImageOk = { ok: true; buffer: Buffer; type: string }
type DownloadImageFailed = { ok: false }

async function downloadImage(
  url: string
): Promise<DownloadImageOk | DownloadImageFailed> {
  const logUrl = url.replace("https://", "")

  const res = await fetch(url, {
    headers: { Referer: "https://www.pixiv.net" }
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

async function generatePreviewsFromUrl(targetUrl: URL) {
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

  let embed = new ToshinEmbedBuilder()
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

export async function pixiv(
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (
    !message.content.match("pixiv") ||
    message.content.startsWith("[pixiv]") ||
    message.attachments.size !== 0
  )
    return

  const url = extractUrl(message.content)
  if (!url) return

  const result = await generatePreviewsFromUrl(url)
  if (!result) return

  await message.reply({
    embeds: [result.embed],
    files: [...result.attachments]
  })
}
