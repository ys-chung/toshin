import fetch, { Response } from "node-fetch";
import Discord from "discord.js";
import TelegramBot from "node-telegram-bot-api";

import { Room } from "../types/Room";
import { ChatMessage } from "../types/ChatMessage";
import _ from "lodash";

// const unwantedTweetRegex = /[\|\||<]+http(s)?:\/\/twitter.com\/[^\s]+[\|\||>]+/g;
const tweetIdRegex = /https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/g;

interface TweetMedia {
    media_key: string;
    type: string;
}

interface TweetIncludes {
    media: TweetMedia[];
}

interface Tweet {
    id: string;
    text: string;
    includes: TweetIncludes;
}

function isThisATweet(candidate: unknown): candidate is Tweet {
    const predicate = candidate as Tweet;

    if (_.isString(predicate.id) && _.isString(predicate.text) && _.isArray(predicate.includes)) {
        return true;
    }
    return false;
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

            if (!isThisATweet(jsonResponse)) return;

            if (jsonResponse.includes?.media.length > 1) {
                const mediaAmount = jsonResponse.includes.media.length;

                message.text = `This tweet contains ${mediaAmount} images.`;
                void sendMessage(message);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

export async function twitter(discordClient: Discord.Client, telegramBot: TelegramBot, bearerToken: string, findRoom: (id: string) => Room | undefined, sendMessage: (message: ChatMessage) => Promise<void>): Promise<void> {
    const primedCheckMessage = (message: ChatMessage) => checkMessage(message, bearerToken, sendMessage);

    discordClient.on("message", (message) => {
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