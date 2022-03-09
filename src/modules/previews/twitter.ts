import { fetch } from "fetch-h2"
import Discord, { Formatters, Util } from "discord.js"
import youtubedl from "youtube-dl-exec"
import _ from "lodash"

import { ConfigInterface } from "../../types/ConfigInterface.js"
import { isMessageChannelAgeRestricted, wait } from "../../utils.js"

import { isThisATweetResponse, TweetResponse } from "./types/TweetResponse.js"

const noPreviewRegex = /<http(s)?:\/\/(?:mobile\.)?twitter\.com\/[^\s]+>/g
const tweetIdRegex =
    /https:\/\/(?:mobile\.)?twitter\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/g

async function getVideoUrl(url: string): Promise<string> {
    const ytdlOutput = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        callHome: false,
        noCheckCertificate: true
    })

    return ytdlOutput.url
}

async function generateVideoPreview(
    tweetMatches: RegExpMatchArray[],
    tweetData: TweetResponse["data"],
    message: Discord.Message<boolean>
): Promise<Discord.ReplyMessageOptions> {
    const videoUrl = await getVideoUrl(tweetMatches[0][0])
    const nsfw = tweetData.possibly_sensitive && !isMessageChannelAgeRestricted(message)
    let content = `Twitter video${nsfw ? "\n(possibly age restricted)" : ""}`
    let files = undefined

    if (!videoUrl.match(".mp4")) {
        content += !nsfw ? videoUrl : `||- ${videoUrl} -||`
    } else {
        files = [
            {
                attachment: videoUrl,
                name: !nsfw ? "video.mp4" : "SPOILER_video.mp4"
            }
        ]
    }

    return {
        content,
        files,
        allowedMentions: {
            repliedUser: false
        }
    }
}

async function generatePhotoAttachments(
    jsonResponse: TweetResponse,
    nsfw: boolean | undefined
) {
    if (!jsonResponse.includes.media)
        throw new Error("Tweet does not contain media details!")

    const photoPromiseArr = jsonResponse.includes.media
        .filter((media) => media.url)
        .map(async (media, index) => {
            if (!media.url) throw new Error("Tweet photo url does not exist")
            const photoExt = _.last(media.url.split(".")) ?? ""
            const photoRes = await fetch(media.url)

            if (!photoRes.ok)
                throw new Error(`Failed to fetch photo from url ${media.url}`)

            return {
                attachment: await photoRes.readable(),
                name: !nsfw
                    ? `preview${index}.${photoExt}`
                    : `SPOILER_preview${index}.${photoExt}`
            }
        })

    return await Promise.all(photoPromiseArr)
}

async function generatePhotoPreview(
    tweetData: TweetResponse["data"],
    message: Discord.Message<boolean>,
    jsonResponse: TweetResponse
): Promise<Discord.ReplyMessageOptions | false> {
    const nsfw = tweetData.possibly_sensitive && !isMessageChannelAgeRestricted(message)
    const photoAttach = generatePhotoAttachments(jsonResponse, nsfw)

    await wait(3000)

    message = await message.fetch(true)
    if (message.embeds.length !== 0) return false

    const tweetAuthor = jsonResponse.includes.users[0]

    const tweetText = tweetData.text
        .split(" ")
        .map((sstr) => {
            if (sstr.startsWith("https://t.co/")) return `<${sstr}>`
            return sstr
        })
        .join(" ")
        .split("\n")
        .map((line) => `> ${line.replaceAll(">", "\\>")}`)
        .join("\n")

    return {
        content: `Twitter photo by ${Formatters.bold(
            Util.escapeMarkdown(tweetAuthor.name)
        )} ${Util.escapeMarkdown(`@${tweetAuthor.username}`)}${
            nsfw ? "\n(possibly age restricted)" : ""
        }\n\n${Util.escapeMarkdown(tweetText)}`,
        files: await photoAttach,
        allowedMentions: {
            repliedUser: false
        }
    }
}

function generatePhotoNumberPreview(
    tweetData: {
        id: string
        text: string
        attachments?: { media_keys: string[] } | undefined
        possibly_sensitive?: boolean | undefined
    },
    message: Discord.Message<boolean>
) {
    if (tweetData.attachments && tweetData.attachments?.media_keys.length > 1) {
        void message.reply({
            content: `This tweet has ${tweetData.attachments?.media_keys.length} images.`,
            allowedMentions: {
                repliedUser: false
            }
        })
    }
}

async function checkMessage(message: Discord.Message, bearerToken: string) {
    const tweetMatches = [...message.cleanContent.matchAll(tweetIdRegex)]

    if (tweetMatches.length === 1) {
        const tweetId = tweetMatches[0][1]

        const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys,author_id&tweet.fields=possibly_sensitive&media.fields=url`

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${bearerToken}` }
        })

        try {
            if (!response.ok)
                throw new Error(
                    `${response.status} ${response.statusText}\n${await response.text()}`
                )

            const jsonResponse: unknown = await response.json()

            if (!isThisATweetResponse(jsonResponse)) return

            const tweetData = jsonResponse.data

            if (
                !message.cleanContent.match(noPreviewRegex) &&
                tweetData.possibly_sensitive &&
                message.embeds.length === 0 &&
                message.attachments.size === 0 &&
                jsonResponse.includes.media &&
                jsonResponse.includes.media[0].type === "photo"
            ) {
                const previewReply = await generatePhotoPreview(
                    tweetData,
                    message,
                    jsonResponse
                )
                if (previewReply) {
                    void message.reply(previewReply)
                } else {
                    generatePhotoNumberPreview(tweetData, message)
                }
            } else {
                generatePhotoNumberPreview(tweetData, message)
            }

            if (
                jsonResponse.includes.media &&
                (jsonResponse.includes.media[0].type === "video" ||
                    jsonResponse.includes.media[0].type === "animated_gif")
            ) {
                void message.reply(
                    await generateVideoPreview(tweetMatches, tweetData, message)
                )
            }
        } catch (error) {
            console.error(error)
        }
    }
}

export async function twitter(
    discordClient: Discord.Client,
    config: ConfigInterface
): Promise<void> {
    const checkMessageWithConfig = (message: Discord.Message) =>
        checkMessage(message, config.moduleConfig.twitter?.bearerToken)

    discordClient.on("messageCreate", (message) => {
        if (
            message.guildId === config.discordGuildId &&
            message.cleanContent.match("https://twitter.com")
        ) {
            void checkMessageWithConfig(message)
        }
    })
}
