import fs from "fs";
import Discord, { TextChannel } from "discord.js";
import TelegramBot, { ParseMode } from "node-telegram-bot-api";

import { ConfigInterface } from "./types/ConfigInterface";
import { ChatMessage } from "./types/ChatMessage"
import { BotType } from "./types/BotType";

import { escapeTextFormat } from "./utils/escapeTextFormat";
import { generateFindRoom } from "./utils/findRoom";

import { echo } from "./modules/echo";
import { choose } from "./modules/choose";

function readConfig(): ConfigInterface {
    try {
        const configFile = fs.readFileSync("./data/config.json").toString();
        const parsedConfig: ConfigInterface = JSON.parse(configFile) as ConfigInterface;
        return parsedConfig;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to read or parse config file.");
    }
}

async function sendMessage(message: ChatMessage, discordClient: Discord.Client, telegramBot: TelegramBot) {

    if (message.room.discordId) {
        const escapedText = escapeTextFormat(message.text, BotType.Discord);
        const text = message.italic ? `*${escapedText}*` : escapedText;
        const channel = await discordClient.channels.fetch(message.room.discordId, true);

        if (channel.type === "text") {
            const textChannel: TextChannel = channel as TextChannel;
            await textChannel.send(text);
        }
    }

    if (message.room.telegramId) {
        const escapedText = escapeTextFormat(message.text, BotType.Telegram);
        const text = message.italic ? `_${escapedText}_` : escapedText;
        const parseMode: ParseMode | undefined = message.italic ? "MarkdownV2" : undefined;
        await telegramBot.sendMessage(message.room.telegramId, text, { parse_mode: parseMode });
    }

}

async function processCommand(message: ChatMessage, discordClient: Discord.Client, telegramBot: TelegramBot) {
    const response = await Promise.any([
        echo(message),
        choose(message)
    ]);

    void sendMessage(response, discordClient, telegramBot);
}

async function init() {
    // Read config
    const config = readConfig();

    // Setup Discord bot
    const discordClient = new Discord.Client();
    await discordClient.login(config.discordToken);
    discordClient.on("error", console.error);

    // Setup Telegram bot
    const telegramBot = new TelegramBot(config.telegramToken, { polling: true });
    telegramBot.on("error", console.error);

    const findRoom = generateFindRoom(config.rooms);

    telegramBot.on("text", (message) => {
        const room = findRoom(String(message.chat.id));

        if (room) {
            if (message.text?.startsWith("/")) {
                const text = message.text;
                const commandMatch = /^\/(\S*)/.exec(text);

                if (!commandMatch || !commandMatch[1]) return;

                const command = commandMatch[1];
                const params = text.substring(commandMatch[0].length);

                const incomingMessage: ChatMessage = { text, room, command, params };

                void processCommand(incomingMessage, discordClient, telegramBot);
            }
        }
    });

}

void init();