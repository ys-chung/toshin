// Dependencies
import fs from "fs";
import Discord, { TextChannel } from "discord.js";
import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";

// Interfaces
import { ConfigInterface, isConfigInterface } from "./types/ConfigInterface";
import { ChatMessage } from "./types/ChatMessage"
import { BotType } from "./types/BotType";

// Utils
import { escapeTextFormat } from "./utils/escapeTextFormat";
import { generateFindRoom } from "./utils/findRoom";

// Commands
import { echo, echoDescription } from "./modules/echo";
import { choose, chooseDescription } from "./modules/choose";
import { stickers } from "./modules/stickers";
import { emotes, emotesDescription } from "./modules/emotes";

// Features
import { twitter } from "./modules/twitter";
import { generateRegisterSlashCommand } from "./modules/registerSlashCommand";

function readConfig(): ConfigInterface {
    try {
        const configFile = fs.readFileSync("./data/config.json").toString();
        const parsedConfig: unknown = JSON.parse(configFile);

        if (!isConfigInterface(parsedConfig)) {
            throw new Error("Config file is malformatted.");
        }

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

        if (channel && channel.type === "text") {
            const textChannel: TextChannel = channel as TextChannel;
            await textChannel.send(text);
        }
    }

    if (message.room.telegramId) {
        const escapedText = escapeTextFormat(message.text, BotType.Telegram);
        const text = message.italic ? `_${escapedText}_` : escapedText;
        const options: SendMessageOptions = { parse_mode: "MarkdownV2" };
        await telegramBot.sendMessage(message.room.telegramId, text, options);
    }

}

async function processCommand(message: ChatMessage, discordClient: Discord.Client, telegramBot: TelegramBot, config: ConfigInterface) {
    // Check if any of the commands return a result
    let response;

    try {
        response = await Promise.any([
            choose(message),
            echo(message),
            emotes(message, config.moduleConfig.emotes?.allowedParams),
            stickers(message)
        ]);
    } catch (error) {
        const allErrors = error as AggregateError;
        const allErrorsArray = allErrors.errors;
        if (!(allErrorsArray.every((e) => e === undefined))) {
            console.error(allErrorsArray);
            throw new Error("Error when executing commands");
        }
    }

    if (response === undefined) return;

    // When one of them returns a result, send the message
    void sendMessage(response, discordClient, telegramBot);
}

async function init() {
    // Read config
    const config = readConfig();

    // Setup Discord bot
    const discordClient = new Discord.Client({ intents: 0 });
    await discordClient.login(config.discordToken);
    discordClient.on("error", console.error);

    // Setup Telegram bot
    const telegramBot = new TelegramBot(config.telegramToken, { polling: true });
    telegramBot.on("error", console.error);

    // Handling commands
    const findCommandRegex = /^\/(\S*)/;

    // Create the find room function with rooms in config
    const findRoom = generateFindRoom(config.rooms);

    discordClient.on("message", (message) => {
        if (!message.author.bot) {
            const room = findRoom(message.channel.id);

            if (room) {
                if (message.cleanContent.startsWith("/")) {
                    const text = message.cleanContent;
                    const commandMatch = findCommandRegex.exec(text);

                    if (!commandMatch || !commandMatch[1]) return;

                    const command = commandMatch[1];

                    const params = text.substring(commandMatch[0].length + 1);
                    const sender = message.author.username;

                    const incomingMessage: ChatMessage = { text, room, command, params, sender };

                    void processCommand(incomingMessage, discordClient, telegramBot, config);
                }
            }
        }
    })

    // When Telegram bot recieves a message
    telegramBot.on("text", (message) => {
        // Find which room the message is from, if configured
        const room = findRoom(String(message.chat.id));

        // If a room is found
        if (room) {

            // If the message could be a command starting with "/"
            if (message.text?.startsWith("/")) {
                const text = message.text;

                // Find the command name
                const commandMatch = findCommandRegex.exec(text);

                // If no command name is found, return
                if (!commandMatch || !commandMatch[1]) return;

                const command = commandMatch[1];

                // Set params as the message without the leading "/" and space
                const params = text.substring(commandMatch[0].length + 1);
                const sender = message.from?.username;

                const incomingMessage: ChatMessage = { text, room, command, params, sender };

                // Process the command
                void processCommand(incomingMessage, discordClient, telegramBot, config);
            }
        }
    });

    let twitterBearerToken = "";
    twitterBearerToken = config.moduleConfig.twitter?.bearerToken;

    // Handling features
    void twitter(discordClient, telegramBot, twitterBearerToken, findRoom, (message: ChatMessage) => sendMessage(message, discordClient, telegramBot));

    void generateRegisterSlashCommand(
        discordClient,
        config.discordGuildId,
        [
            emotesDescription,
            echoDescription,
            chooseDescription
        ])
}

void init();