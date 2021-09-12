import fetch from "cross-fetch";
import Discord from "discord.js";
import youtubedl from "youtube-dl-exec";

import _ from "lodash";
import { ConfigInterface } from "../types/ConfigInterface";

// const unwantedTweetRegex = /[\|\||<]+http(s)?:\/\/twitter.com\/[^\s]+[\|\||>]+/g;
const tweetIdRegex = /https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/g;

interface TweetResponse {
    data: {
        id: string;
        text: string;
        attachments?: {
            media_keys: string[];
        };
    };
    includes?: {
        media?: { media_key: string, type: "animated_gif" | "photo" | "video" }[]
    }
}

function isThisATweetResponse(candidate: unknown): candidate is TweetResponse {
    const predicate = candidate as TweetResponse;

    return (_.isString(predicate.data.id) && _.isString(predicate.data.text));
}

async function checkStatus(response: Response) {
    if (response.ok) {
        // response.status >= 200 && response.status < 300
        return true;
    }
    throw new Error(`${response.status} ${response.statusText}\n${await response.text()}`);
}

async function checkMessage(message: Discord.Message, bearerToken: string) {
    const tweetMatches = [...message.cleanContent.matchAll(tweetIdRegex)];

    if (tweetMatches.length === 1) {
        const tweetId = tweetMatches[0][1];

        const url = `https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys`;

        const response = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });

        try {
            await checkStatus(response);

            const jsonResponse: unknown = await response.json();

            if (!isThisATweetResponse(jsonResponse)) return;

            const tweetData = jsonResponse.data;

            if (tweetData.attachments && tweetData.attachments?.media_keys.length > 1) {
                const mediaAmount = tweetData.attachments?.media_keys.length;

                void message.reply(`This tweet has ${mediaAmount} images.`);
            }

            if (jsonResponse.includes?.media && jsonResponse.includes?.media[0].type === "video") {
                const ytdlOutput = await youtubedl(tweetMatches[0][0], {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCallHome: true,
                    noCheckCertificate: true,
                });

                void message.reply(`Twitter video: ${ytdlOutput.url}`);
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