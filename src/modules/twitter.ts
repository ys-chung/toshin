import got from "got";
import Discord from "discord.js";
import youtubedl from "youtube-dl-exec";

import _ from "lodash";
import { ConfigInterface } from "../types/ConfigInterface.js";

// const unwantedTweetRegex = /[\|\||<]+http(s)?:\/\/twitter.com\/[^\s]+[\|\||>]+/g;
const tweetIdRegex = /https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/g;

interface TweetResponse {
    data: {
        id: string;
        text: string;
        attachments?: {
            media_keys: string[];
        };
        possibly_sensitive?: boolean;
    };
    includes?: {
        media?: { media_key: string, type: "animated_gif" | "photo" | "video" }[]
    }
}

function isThisATweetResponse(candidate: unknown): candidate is TweetResponse {
    const predicate = candidate as TweetResponse;

    return (_.isString(predicate.data.id) && _.isString(predicate.data.text));
}

async function getVideoUrl(url: string): Promise<string> {
    const ytdlOutput = await youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
    });

    return ytdlOutput.url
}

function isMessageChannelNsfw(message: Discord.Message) {
    switch (message.channel.type) {
        case "GUILD_TEXT":
        case "GUILD_NEWS":
            return message.channel.nsfw;
            break;

        case "GUILD_PUBLIC_THREAD":
        case "GUILD_PRIVATE_THREAD":
        case "GUILD_NEWS_THREAD":
            return message.channel.parent?.nsfw ?? false;
            break;

        default:
            return false;
    }
}

async function checkMessage(message: Discord.Message, bearerToken: string) {
    const tweetMatches = [...message.cleanContent.matchAll(tweetIdRegex)];

    if (tweetMatches.length === 1) {
        const tweetId = tweetMatches[0][1];

        const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys&tweet.fields=possibly_sensitive`;

        try {
            const response = await got(url, {
                headers: { Authorization: `Bearer ${bearerToken}` },
                http2: true
            }).json();

            if (!isThisATweetResponse(response)) return;

            const tweetData = response.data;

            if (tweetData.attachments && tweetData.attachments?.media_keys.length > 1) {
                const mediaAmount = tweetData.attachments?.media_keys.length;

                void message.reply({
                    content: `This tweet has ${mediaAmount} images.`,
                    allowedMentions: {
                        repliedUser: false
                    }
                });
            }

            if (response.includes?.media && response.includes?.media[0].type === "video") {
                let videoUrl = await getVideoUrl(tweetMatches[0][0]);

                if (tweetData.possibly_sensitive && !isMessageChannelNsfw(message)) {
                    videoUrl = `(possibly nsfw) ||⚠️ ${videoUrl} ⚠️||`
                }

                const reply: Discord.ReplyMessageOptions = {
                    content: `Twitter video: ${videoUrl}`,
                    allowedMentions: {
                        repliedUser: false
                    }
                }

                void message.reply(reply);
            }

        } catch (error) {
            console.error(error);
        }
    }
}

export async function twitter(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    const primedCheckMessage = (message: Discord.Message) => checkMessage(message, config.moduleConfig.twitter?.bearerToken);

    discordClient.on("messageCreate", (message) => {
        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        if (message.guildId === config.discordGuildId && message.cleanContent.match("https://twitter.com")) {
            void primedCheckMessage(message);
        }
    });
}