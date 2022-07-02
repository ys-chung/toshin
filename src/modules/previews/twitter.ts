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
    console.log(`Twitter: getting video url for tweet ${url}`)

    const ytdlOutput = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        callHome: false,
        noCheckCertificate: true
    })

    console.log(`Twitter: got video url for tweet ${url}`)
    return ytdlOutput.url
}

async function generateVideoPreview(
    tweetMatches: RegExpMatchArray[],
    tweetData: TweetResponse["data"],
    message: Discord.Message<boolean>
): Promise<Discord.ReplyMessageOptions> {
    console.log("Twitter: generating video preview")

    const videoUrl = await getVideoUrl(tweetMatches[0][0])
    const nsfw = tweetData.possibly_sensitive && !isMessageChannelAgeRestricted(message)
    let content = `Twitter video${nsfw ? "\n(possibly age restricted)" : ""}\n`
    content += !nsfw ? videoUrl : `||- ${videoUrl} -||`

    console.log("Twitter: generated video preview")

    return {
        content,
        allowedMentions: {
            repliedUser: false
        }
    }
}

async function generatePhotoAttachments(
    jsonResponse: TweetResponse,
    nsfw: boolean | undefined
) {
    console.log("Twitter: Generating photo attachment")

    if (!jsonResponse.includes.media)
        throw new Error("Tweet does not contain media details!")

    const photoPromiseArr = jsonResponse.includes.media
        .filter((media) => media.url)
        .map(async (media, index) => {
            if (!media.url) throw new Error("Tweet photo url does not exist")
            console.log(`Twitter: Downloading photo from ${media.url}`)

            const photoExt = _.last(media.url.split(".")) ?? ""
            const photoRes = await fetch(media.url)

            if (!photoRes.ok)
                throw new Error(`Failed to fetch photo from url ${media.url}`)

            console.log(`Twitter: Downloaded photo from ${media.url}`)
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
    console.log("Twitter: starting to generate photo preview")

    const nsfw = tweetData.possibly_sensitive && !isMessageChannelAgeRestricted(message)
    const photoAttach = generatePhotoAttachments(jsonResponse, nsfw)

    await wait(3000)

    message = await message.fetch(true)
    if (message.embeds.length !== 0) {
        console.log("Twitter: message already has preview")
        return false
    }
    console.log(
        "Twitter: Message does not have preview after timeout, generating photo preview"
    )

    const tweetAuthor = jsonResponse.includes.users[0]

    const tweetText = tweetData.text
        .split(" ")
        .map((sstr) => {
            if (sstr.startsWith("https://t.co/")) return `<${sstr}>`
            return sstr
        })
        .join(" ")
        .split("\n")
        .map((sstr) => {
            if (sstr.startsWith("https://t.co/")) return `<${sstr}>`
            return sstr
        })
        .map((line) => `> ${line.replaceAll(">", "\\>")}`)
        .join("\n")

    console.log("Twitter: photo preview generation successful")
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
    console.log("Twitter: generating media number preview")

    if (tweetData.attachments && tweetData.attachments?.media_keys.length > 1) {
        console.log("Twitter: media number preview generated")

        void message.reply({
            content: `This tweet has ${tweetData.attachments?.media_keys.length} images.`,
            allowedMentions: {
                repliedUser: false
            }
        })
    } else {
        console.log("Twitter: tweet has none or one media")
    }
}

async function checkMessage(message: Discord.Message, bearerToken: string) {
    const tweetMatches = [...message.cleanContent.matchAll(tweetIdRegex)]

    if (tweetMatches.length !== 1) {
        console.log("Twitter: Message contains more than one tweet link")
        return
    }

    const tweetId = tweetMatches[0][1]

    const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys,author_id&tweet.fields=possibly_sensitive&media.fields=url`

    console.log(`Twitter: getting info from api for tweet ${tweetId}`)

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` }
    })

    try {
        if (!response.ok)
            throw new Error(
                `${response.status} ${response.statusText}\n${await response.text()}`
            )

        console.log(`Twitter: got info from api for tweet ${tweetId}`)

        const jsonResponse: unknown = await response.json()

        if (!isThisATweetResponse(jsonResponse)) {
            console.log(`Twitter: tweet info from api for tweet ${tweetId} invalid`)
            return
        }

        const tweetData = jsonResponse.data

        if (
            !message.cleanContent.match(noPreviewRegex) &&
            // tweetData.possibly_sensitive &&
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
            console.log("Twitter: Message has Twitter link")
            void checkMessageWithConfig(message)
        }
    })
}
