import Discord, { Formatters, Util } from "discord.js"
import { fetch } from "fetch-h2";

import { PixivIllustDetail } from "pixiv.ts"

import { ConfigInterface } from "../../types/ConfigInterface.js";
import { isMessageChannelNsfw } from "../../utils.js";

const messageArtworkIdRegex = /(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?/g

async function getArtworkInfo(illustId: string, endpoint: string) {
    const infoRes = await fetch(`${endpoint}/api/pixiv/illust?id=${illustId}`)

    if (!infoRes.ok) throw new Error(`Fetch info for illustId ${illustId} failed!`);

    const { illust } = await infoRes.json() as PixivIllustDetail;

    const imageRes = await fetch(illust.image_urls?.large ?? illust.image_urls.medium, {
        allowForbiddenHeaders: true,
        headers: { Referer: "https://app-api.pixiv.net/" }
    })

    if (!imageRes.ok) throw new Error(`Fetch image for illustId ${illustId} failed!`);

    return {
        illustId,
        title: Util.escapeMarkdown(illust.title),
        userName: Util.escapeMarkdown(illust.user.name),
        userId: illust.user.id,
        nsfw: illust.restrict > 0 || illust.x_restrict > 0 || illust.sanity_level > 2,
        image: await imageRes.readable()
    }
}

function generateReplyFromArtworkInfo(
    message: Discord.Message,
    artworkInfo: Awaited<ReturnType<typeof getArtworkInfo>>
): Discord.MessageOptions {

    let contentString = `${Formatters.bold(artworkInfo.title)}\nby ${artworkInfo.userName}`

    const nsfwWarning = artworkInfo.nsfw && !isMessageChannelNsfw(message)
    if (nsfwWarning) contentString += "\n(Possibly nsfw)"

    return {
        content: contentString,
        files: [{
            attachment: artworkInfo.image,
            name: nsfwWarning ? "SPOILER_preview.jpg" : undefined
        }],
        allowedMentions: {
            repliedUser: false
        }
    }
}

export async function pixivPassive(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    discordClient.on("messageCreate", async (message) => {
        if (message.guildId === config.discordGuildId &&
            !message.cleanContent.startsWith("!") &&
            message.cleanContent.match("https://www.pixiv.net") &&
            message.attachments.size === 0
        ) {
            const pixivMatches = [...message.cleanContent.matchAll(messageArtworkIdRegex)];

            if (pixivMatches.length === 1) {
                const illustId = pixivMatches[0][1];
                try {
                    const artworkInfo = await getArtworkInfo(illustId, config.moduleConfig.pixiv?.endpoint)
                    const reply = generateReplyFromArtworkInfo(message, artworkInfo)

                    void message.reply(reply)
                } catch (error) {
                    console.error(error)
                }
            }
        }
    })
}