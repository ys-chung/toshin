import Discord, { Formatters, Util } from "discord.js"
import { setup, fetch } from "fetch-h2"
setup({ session: { rejectUnauthorized: false } })

import { PixivIllustDetail } from "pixiv.ts"

import { ConfigInterface } from "../../types/ConfigInterface.js"
import { isMessageChannelAgeRestricted } from "../../utils.js"

const messageArtworkIdRegex =
    /(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?/g

async function getArtworkInfoJson(illustId: string, endpoint: string) {
    const infoRes = await fetch(`${endpoint}/api/pixiv/illust?id=${illustId}`)

    if (!infoRes.ok)
        throw new Error(
            `Fetch info for illustId ${illustId} failed!\nHTTP ${infoRes.status}, Endpoint: ${endpoint}`
        )

    const { illust } = (await infoRes.json()) as PixivIllustDetail

    if (illust === undefined)
        throw new Error(
            `Illust info is undefined!\nHTTP ${infoRes.status}, Endpoint: ${endpoint}`
        )

    return illust
}

async function downloadUgoira(illustId: string, ugoiraEndpoint: string) {
    const res = await fetch(
        `${ugoiraEndpoint}/convert?url=${encodeURIComponent(
            `https://www.pixiv.net/en/artworks/${illustId}`
        )}&format=gif`,
        {
            allowForbiddenHeaders: true,
            headers: {
                Referer: ugoiraEndpoint
            },
            method: "GET"
        }
    )

    if (!res.ok) throw new Error(`Download ugoira ${illustId} failed`)

    const resJson = (await res.json()) as { url: string }

    if (!resJson.url) throw new Error(`Download ugoira ${illustId} failed`)

    return await fetch(resJson.url)
}

async function getArtworkInfo(
    illustId: string,
    endpoints: string[],
    imgMirror: string,
    ugoiraEndpoint: string
) {
    for (const endpoint of endpoints) {
        try {
            const illust = await getArtworkInfoJson(illustId, endpoint)

            const imageRes =
                illust.type === "ugoira"
                    ? await downloadUgoira(illustId, ugoiraEndpoint)
                    : await fetch(`${imgMirror}/img?img_id=${illustId}`)

            if (!imageRes.ok)
                throw new Error(`Fetch image for illustId ${illustId} failed!`)

            return {
                illustId,
                title: Util.escapeMarkdown(illust.title),
                userName: Util.escapeMarkdown(illust.user.name),
                userId: illust.user.id,
                nsfw:
                    illust.restrict > 0 ||
                    illust.x_restrict > 0 ||
                    illust.sanity_level > 2,
                image: await imageRes.readable(),
                imageType: illust.type === "ugoira" ? "gif" : undefined
            }
        } catch (e) {
            console.error(e)
            continue
        }
    }

    throw new Error("None of the endpoints returned a result!")
}

function generateReplyFromArtworkInfo(
    message: Discord.Message,
    artworkInfo: Awaited<ReturnType<typeof getArtworkInfo>>
): Discord.MessageOptions {
    let contentString = `${Formatters.bold(artworkInfo.title)}\nby ${
        artworkInfo.userName
    }`

    const nsfwWarning = artworkInfo.nsfw && !isMessageChannelAgeRestricted(message)
    if (nsfwWarning) contentString += "\n(possibly age restricted)"

    return {
        content: contentString,
        files: [
            {
                attachment: artworkInfo.image,
                name: nsfwWarning
                    ? artworkInfo.imageType === "gif"
                        ? "SPOILER_preview.gif"
                        : "SPOILER_preview.jpg"
                    : artworkInfo.imageType === "gif"
                    ? "preview.gif"
                    : undefined
            }
        ],
        allowedMentions: {
            repliedUser: false
        }
    }
}

export async function pixivPassive(
    discordClient: Discord.Client,
    config: ConfigInterface
): Promise<void> {
    const endpoints = config.moduleConfig.pixiv.apiEndpoints.split(";")
    const imgMirror = config.moduleConfig.pixiv.imgMirror
    const ugoiraEndpoint = config.moduleConfig.pixiv.ugoiraEndpoint

    discordClient.on("messageCreate", async (message) => {
        if (
            !(
                message.guildId === config.discordGuildId &&
                !message.cleanContent.startsWith("!") &&
                message.cleanContent.includes("https://www.pixiv.net") &&
                message.attachments.size === 0
            )
        )
            return

        const pixivMatches = [...message.cleanContent.matchAll(messageArtworkIdRegex)]

        if (pixivMatches.length !== 1) return

        const illustId = pixivMatches[0][1]
        try {
            const artworkInfo = await getArtworkInfo(
                illustId,
                endpoints,
                imgMirror,
                ugoiraEndpoint
            )
            const reply = generateReplyFromArtworkInfo(message, artworkInfo)

            void message.reply(reply)
        } catch (error) {
            console.error(error)
        }
    })
}
