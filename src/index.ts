// Dependencies
import fs from "fs";
import Discord, { Util } from "discord.js";
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
import { stickers, stickersDescription } from "./modules/stickers";
import { emotes, emotesDescription } from "./modules/emotes";

// Features
import { twitter } from "./modules/twitter";
import { registerSlashCommands } from "./modules/registerSlashCommands";

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

async function sendDiscordMessage(message: ChatMessage, discordClient: Discord.Client) {
    if (message.room.discordId) {
        const escapedText = escapeTextFormat(message.text, BotType.Discord);
        const text = message.italic ? `*${escapedText}*` : escapedText;
        const channel = await discordClient.channels.fetch(message.room.discordId);

        if (channel && channel.type === "text") {
            const textChannel: Discord.TextChannel = channel as Discord.TextChannel;
            await textChannel.send(text);
        }
    }
}

async function sendTelegramMessage(message: ChatMessage, telegramBot: TelegramBot) {
    if (message.room.telegramId) {
        const escapedText = escapeTextFormat(message.text, BotType.Telegram);
        let text = message.italic ? `_${escapedText}_` : escapedText;
        text = message.prefix ? `${message.prefix}\n\n${text}` : text;
        const options: SendMessageOptions = { parse_mode: "MarkdownV2" };
        await telegramBot.sendMessage(message.room.telegramId, text, options);
    }
}

async function sendMessage(message: ChatMessage, discordClient: Discord.Client, telegramBot: TelegramBot) {
    void sendDiscordMessage(message, discordClient);
    void sendTelegramMessage(message, telegramBot);
}

async function processCommand(
    message: ChatMessage,
    config: ConfigInterface,
    send = false,
    discordClient?: Discord.Client,
    telegramBot?: TelegramBot,
) {
    const incomingMessage = { ...message };
    // Check if any of the commands return a result
    let response;

    try {
        response = await Promise.any([
            choose(incomingMessage),
            echo(incomingMessage),
            emotes(incomingMessage, config.moduleConfig.emotes?.allowedParams),
            stickers(incomingMessage)
        ]);
    } catch (error) {
        const allErrors = error as AggregateError;
        const allErrorsArray = allErrors.errors;
        if (!(allErrorsArray.every((e) => e === undefined))) {
            console.error(allErrorsArray);
            throw new Error("Error when executing commands");
        }
    }

    if (send) {
        if (!(discordClient && telegramBot)) {
            throw new Error(`Was asked to send a message, but no discordClient or telegramBot was passed as parameters`);
        }

        if (response) void sendMessage(response, discordClient, telegramBot);
        return;
    }

    return response;
}

async function processDiscordInteraction(
    incomingMessage: ChatMessage,
    interaction: Discord.CommandInteraction,
    config: ConfigInterface,
    telegramBot: TelegramBot
) {

    const response = await processCommand(incomingMessage, config);

    if (response) {
        const escapedText = escapeTextFormat(response.text, BotType.Discord);
        const text = response.italic ? `*${escapedText}*` : escapedText;

        void interaction.reply({ content: text, ephemeral: !!response.isEphemeral });

        if (!response.isEphemeral) {
            const prefixUsername = escapeTextFormat(`<${incomingMessage.sender || ""}>`, BotType.Telegram);
            response.prefix = `*${prefixUsername}* ${escapeTextFormat(incomingMessage.text, BotType.Telegram)}`;
            void sendTelegramMessage(response, telegramBot);
        }
    }

}

async function init() {
    // Read config
    const config = readConfig();

    // Setup Discord bot
    const discordClient = new Discord.Client({
        intents: [
            `GUILDS`, `GUILD_EMOJIS`, `GUILD_INTEGRATIONS`, `GUILD_MESSAGES`, `GUILD_MESSAGE_REACTIONS`
        ]
    });
    await discordClient.login(config.discordToken);
    console.log(`Discord ready`);
    discordClient.on("error", console.error);

    // Setup Telegram bot
    const telegramBot = new TelegramBot(config.telegramToken, { polling: true });
    console.log(`Telegram ready`);
    telegramBot.on("error", console.error);

    const findCommandRegex = /^[/!](\S*)/;

    // Create the find room function with rooms in config
    const findRoom = generateFindRoom(config.rooms);

    discordClient.on("interaction", interaction => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!interaction.member?.user.bot) {
            const room = interaction.channelID ? findRoom(interaction.channelID) : undefined;

            if (room && interaction.isCommand()) {
                const command = interaction.commandName;

                const member = interaction.member as Discord.GuildMember;
                const sender = member.nickname || interaction.user.username;

                const paramsJoinChar = (command === `choose`) ? ";" : " ";

                const params = interaction.options.map(option => {
                    if (option.type === `STRING`) {
                        const cleanContent = Util.cleanContent(option.value as string, interaction.channel as Discord.Channel);
                        return cleanContent;
                    }
                }).join(paramsJoinChar);

                const text = `/${command} ${params}`
                const incomingMessage: ChatMessage = { text, room, command, params, sender };

                void processDiscordInteraction(incomingMessage, interaction, config, telegramBot);

            }
        }
    })

    discordClient.on("message", (message) => {
        if (!message.author.bot) {
            const room = findRoom(message.channel.id);

            if (room) {
                if (message.cleanContent.startsWith("/") || message.cleanContent.startsWith("!")) {
                    const text = message.cleanContent;
                    const commandMatch = findCommandRegex.exec(text);

                    if (!commandMatch || !commandMatch[1]) return;

                    let command = commandMatch[1];

                    if (command.endsWith(`@${config.telegramBotUsername}`)) {
                        command = command.substring(0, command.length - `@${config.telegramBotUsername}`.length);
                    }

                    const params = text.substring(commandMatch[0].length + 1);
                    const sender = message.author.username;

                    const incomingMessage: ChatMessage = { text, room, command, params, sender };

                    void processCommand(incomingMessage, config, true, discordClient, telegramBot);
                }
            }
        }
    })

    telegramBot.on("text", (message) => {
        // Find which room the message is from, if configured
        const room = findRoom(String(message.chat.id));

        // If a room is found
        if (room) {

            // If the message could be a command starting with "/"
            if (message.text?.startsWith("/") || message.text?.startsWith("!")) {
                const text = message.text;

                // Find the command name
                const commandMatch = findCommandRegex.exec(text);

                // If no command name is found, return
                if (!commandMatch || !commandMatch[1]) return;

                let command = commandMatch[1];

                if (command.endsWith(`@${config.telegramBotUsername}`)) {
                    command = command.substring(0, command.length - `@${config.telegramBotUsername}`.length);
                }

                // Set params as the message without the leading "/" and space
                const params = text.substring(commandMatch[0].length + 1);
                const sender = message.from?.username;

                const incomingMessage: ChatMessage = { text, room, command, params, sender };

                // Process the command
                void processCommand(incomingMessage, config, true, discordClient, telegramBot);
            }
        }
    });

    let twitterBearerToken = "";
    twitterBearerToken = config.moduleConfig.twitter?.bearerToken;

    // Handling features
    void twitter(discordClient, telegramBot, twitterBearerToken, findRoom, (message: ChatMessage) => sendMessage(message, discordClient, telegramBot));

    void registerSlashCommands(
        discordClient,
        config.discordGuildId,
        [
            emotesDescription,
            echoDescription,
            chooseDescription,
            stickersDescription
        ]);
}

void init();