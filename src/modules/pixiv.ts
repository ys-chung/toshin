import Discord, { Formatters, Util } from "discord.js"
import { fetch } from "fetch-h2";

import { PixivIllustDetail } from "pixiv.ts"

import { CommandMessage, CommandMessageReplyOptions } from "../CommandMessage.js";
import { CommandDescription } from "../types/CommandDescription.js";
import { ConfigInterface } from "../types/ConfigInterface.js";
import { isMessageChannelNsfw } from "../utils.js";

const commandArtworkIdRegex = /^(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?$/
const messageArtworkIdRegex = /(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?/g

type ArtworkInfo = {
    illustId: string;
    title: string;
    userName: string;
    userId: number;
    nsfw: boolean;
    image: NodeJS.ReadableStream
}

async function getArtworkInfo(illustId: string, endpoint: string): Promise<ArtworkInfo> {
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

function generateReplyFromArtworkInfo(message: Discord.Message | CommandMessage, artworkInfo: ArtworkInfo): Discord.MessageOptions {
    const illustUrl = `<https://www.pixiv.net/en/artworks/${artworkInfo.illustId}>`
    const userUrl = `<https://www.pixiv.net/en/users/${artworkInfo.userId}>`

    let contentString = message.type === "interaction" ? 
    Formatters.hyperlink(Formatters.bold(artworkInfo.title), illustUrl) + "\nby " + Formatters.hyperlink(artworkInfo.userName, userUrl) :
    `${artworkInfo.title}\nby ${artworkInfo.userName}`

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

export async function pixiv(message: CommandMessage, endpoint: string): Promise<void> {
    if (message.command === "pixiv" || message.command === "p") {
        const match = message.params[0]?.match(commandArtworkIdRegex);

        if (match?.[1]) {
            await message.deferReply();

            message.paramString = `<https://www.pixiv.net/en/artworks/${match?.[1]}>`;

            try {
                const artworkInfo = await getArtworkInfo(match?.[1], endpoint)
                const reply: CommandMessageReplyOptions = generateReplyFromArtworkInfo(message, artworkInfo)
                reply.escape = false

                void message.forceReply(reply)
            } catch (error) {
                console.error(error)

                void message.reply({
                    content: "An error occured! Please try again.",
                    isError: true
                })
            }
        } else {
            void message.reply({
                content: "Cannot find artwork ID! Please make sure the command parameter comprises the url only.",
                isError: true
            })
        }
    }
}

export async function pixivActive(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
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

export const pixivDescription: CommandDescription = {
    name: "pixiv",
    commands: [
        {
            name: "pixiv",
            description: "get full-size pixiv preview from url",
            options: [
                {
                    name: "url",
                    description: "pixiv page url",
                    type: "STRING",
                    required: true
                }
            ]
        },
        {
            name: "p",
            description: "get full-size pixiv preview from url",
            options: [
                {
                    name: "url",
                    description: "pixiv page url",
                    type: "STRING",
                    required: true
                }
            ]
        }
    ]
}