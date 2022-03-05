import { fetch } from "fetch-h2"
import Discord from "discord.js"
import youtubedl from "youtube-dl-exec"

import { ConfigInterface } from "../../types/ConfigInterface.js"
import { isMessageChannelAgeRestricted } from "../../utils.js"

import { isThisATweetResponse } from "./types/TweetResponse.js"

// const unwantedTweetRegex = /[\|\||<]+http(s)?:\/\/twitter.com\/[^\s]+[\|\||>]+/g;
const tweetIdRegex = /https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/g

async function getVideoUrl(url: string): Promise<string> {
    const ytdlOutput = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        callHome: false,
        noCheckCertificate: true
    })

    return ytdlOutput.url
}

async function checkMessage(message: Discord.Message, bearerToken: string) {
    const tweetMatches = [...message.cleanContent.matchAll(tweetIdRegex)]

    if (tweetMatches.length === 1) {
        const tweetId = tweetMatches[0][1]

        const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys&tweet.fields=possibly_sensitive`

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${bearerToken}` }
        })

        try {
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}\n${await response.text()}`)

            const jsonResponse: unknown = await response.json()

            if (!isThisATweetResponse(jsonResponse)) return

            const tweetData = jsonResponse.data

            if (tweetData.attachments && tweetData.attachments?.media_keys.length > 1) {
                const mediaAmount = tweetData.attachments?.media_keys.length

                void message.reply({
                    content: `This tweet has ${mediaAmount} images.`,
                    allowedMentions: {
                        repliedUser: false
                    }
                })
            }

            if (jsonResponse.includes?.media &&
                (jsonResponse.includes?.media[0].type === "video" ||
                    jsonResponse.includes?.media[0].type === "animated_gif")
            ) {
                const videoUrl = await getVideoUrl(tweetMatches[0][0])
                const nsfw = tweetData.possibly_sensitive && !isMessageChannelAgeRestricted(message)
                let content = "Twitter video"
                let files = undefined

                if (!videoUrl.match(".mp4")) {
                    content += !nsfw ? videoUrl : `||- ${videoUrl} -||`
                } else {
                    files = [{
                        attachment: videoUrl,
                        name: !nsfw ? "video.mp4" : "SPOILER_video.mp4"
                    }]
                }

                const reply: Discord.ReplyMessageOptions = {
                    content,
                    files,
                    allowedMentions: {
                        repliedUser: false
                    }
                }

                void message.reply(reply)
            }

        } catch (error) {
            console.error(error)
        }
    }
}

export async function twitter(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    const primedCheckMessage = (message: Discord.Message) => checkMessage(message, config.moduleConfig.twitter?.bearerToken)

    discordClient.on("messageCreate", (message) => {
        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        if (message.guildId === config.discordGuildId && message.cleanContent.match("https://twitter.com")) {
            void primedCheckMessage(message)
        }
    })
}