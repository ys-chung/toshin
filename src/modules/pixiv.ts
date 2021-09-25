import Discord from "discord.js"

import { CommandMessage } from "../CommandMessage.js";
import { CommandDescription } from "../types/CommandDescription.js";
import { ConfigInterface } from "../types/ConfigInterface.js";

const commandArtworkIdRegex = /^(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?$/
const messageArtworkIdRegex = /(?:<)?https:\/\/www\.pixiv\.net\/(?:en\/artworks\/|artworks\/)(\d+)(?:>)?/g

export async function pixiv(message: CommandMessage): Promise<void> {
    if (message.command === "pixiv" || message.command === "p") {
        const match = message.params[0]?.match(commandArtworkIdRegex);

        if (match?.[1]) {
            await message.deferReply();

            message.paramString = `<https://www.pixiv.net/en/artworks/${match?.[1]}>`;
            void message.forceReply({
                content: `<https://www.pixiv.net/en/artworks/${match?.[1]}>`,
                files: [
                    {
                        attachment: `https://pximg.rainchan.win/img?img_id=${match?.[1]}`,
                        name: "preview.jpg"
                    }
                ]
            })
        } else {
            void message.reply({
                content: `Cannot find artwork ID! Please make sure the command parameter comprises the url only.`,
                isError: true
            })
        }
    }
}

export async function pixivActive(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    discordClient.on("messageCreate", (message) => {
        if (message.guildId === config.discordGuildId &&
            message.cleanContent.match("https://www.pixiv.net") &&
            message.attachments.size === 0
        ) {
            const pixivMatches = [...message.cleanContent.matchAll(messageArtworkIdRegex)];

            if (pixivMatches.length === 1) {
                const pixivId = pixivMatches[0][1];
                message.reply({
                    content: `<https://www.pixiv.net/en/artworks/${pixivId}>`,
                    files: [
                        {
                            attachment: `https://pximg.rainchan.win/img?img_id=${pixivId}`,
                            name: "preview.jpg"
                        }
                    ],
                    allowedMentions: {
                        repliedUser: false
                    }
                })
            }
        }
    })
}

export const pixivDescription: CommandDescription = {
    name: `pixiv`,
    commands: [
        {
            name: `pixiv`,
            description: `get full-size pixiv preview from url`,
            options: [
                {
                    name: `url`,
                    description: `pixiv page url`,
                    type: `STRING`,
                    required: true
                }
            ]
        },
        {
            name: `p`,
            description: `get full-size pixiv preview from url`,
            options: [
                {
                    name: `url`,
                    description: `pixiv page url`,
                    type: `STRING`,
                    required: true
                }
            ]
        }
    ]
}