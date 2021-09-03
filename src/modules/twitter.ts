import fetch, { Response } from "node-fetch";
import Discord from "discord.js";
import TelegramBot from "node-telegram-bot-api";
import youtubedl from "youtube-dl-exec";

import { Room } from "../types/Room.js";
import { ChatMessage } from "../types/ChatMessage.js";
import _ from "lodash";

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

async function checkMessage(message: ChatMessage, bearerToken: string, sendMessage: (message: ChatMessage) => Promise<void>) {
    const tweetMatches = [...message.text.matchAll(tweetIdRegex)];

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

                message.text = `This tweet contains ${mediaAmount} images.`;
                void sendMessage(message);
            }

            if (jsonResponse.includes?.media && jsonResponse.includes?.media[0].type === "video") {
                const ytdlOutput = await youtubedl(tweetMatches[0][0], {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCallHome: true,
                    noCheckCertificate: true,
                });

                message.text = `Twitter video: ${ytdlOutput.url}`;
                message.discordEscape = false;

                void sendMessage(message);
            }

        } catch (error) {
            console.error(error);
        }
    }
}

export async function twitter(discordClient: Discord.Client, telegramBot: TelegramBot, bearerToken: string, findRoom: (id: string) => Room | undefined, sendMessage: (message: ChatMessage) => Promise<void>): Promise<void> {
    const primedCheckMessage = (message: ChatMessage) => checkMessage(message, bearerToken, sendMessage);

    discordClient.on("messageCreate", (message) => {
        const room = findRoom(message.channel.id);

        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        if (!message.author.bot && room && message.cleanContent.match("https://twitter.com")) {
            const text = message.cleanContent;
            const incomingMessage: ChatMessage = { text, room };

            void primedCheckMessage(incomingMessage);
        }
    });

    telegramBot.on("message", (message) => {
        const room = findRoom(String(message.chat.id));

        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
        if (room && message.text?.match("https://twitter.com")) {
            const text = message.text;
            const incomingMessage: ChatMessage = { text, room };

            void primedCheckMessage(incomingMessage);
        }
    });
}