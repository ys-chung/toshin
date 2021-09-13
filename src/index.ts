// Dependencies
import fs from "fs";
import Discord, { Util } from "discord.js";

// Interfaces
import { ConfigInterface, isConfigInterface } from "./types/ConfigInterface.js";
import { ChatMessage } from "./types/ChatMessage.js"
import { BotType } from "./types/BotType.js";

// Utils
import { escapeTextFormat } from "./utils/escapeTextFormat.js";
import { generateFindRoom } from "./utils/findRoom.js";

// Commands
import { echo, echoDescription } from "./modules/echo.js";
import { choose, chooseDescription } from "./modules/choose.js";
import { stickers, stickersDescription } from "./modules/stickers.js";
import { emotes, emotesDescription } from "./modules/emotes.js";

// Features
import { twitter } from "./modules/twitter.js";
import { registerSlashCommands } from "./modules/registerSlashCommands.js";
import { Room } from "./types/Room.js";

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
        const escapedText = message.discordEscape === false ? message.text : escapeTextFormat(message.text, BotType.Discord);
        const text = message.italic ? `*${escapedText}*` : escapedText;
        const channel = await discordClient.channels.fetch(message.room.discordId);

        if (channel && channel.type === "GUILD_TEXT") {
            const textChannel: Discord.TextChannel = channel as Discord.TextChannel;
            await textChannel.send(text);
        }
    }
}

async function sendMessage(message: ChatMessage, discordClient: Discord.Client) {
    void sendDiscordMessage(message, discordClient);
}

async function processCommand(
    message: ChatMessage,
    config: ConfigInterface,
    send = false,
    discordClient?: Discord.Client
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
        if (!discordClient) {
            throw new Error(`Was asked to send a message, but no discordClient was passed as parameters`);
        }

        if (response) void sendMessage(response, discordClient);
        return;
    }

    return response;
}

async function processDiscordInteraction(
    incomingMessage: ChatMessage,
    interaction: Discord.CommandInteraction,
    config: ConfigInterface
) {

    const response = await processCommand(incomingMessage, config);

    if (response) {
        const escapedText = escapeTextFormat(response.text, BotType.Discord);
        const text = response.italic ? `*${escapedText}*` : escapedText;

        let textPrefix: string;

        if (!response.isEphemeral) {
            if (incomingMessage.sender) {
                textPrefix = `${incomingMessage.sender}: `
            } else {
                textPrefix = "Command: "
            }

            textPrefix += `${incomingMessage.text}\n\n`
        } else {
            textPrefix = "Command: \n\n"
        }

        void interaction.reply({ content: `${textPrefix}${text}`, ephemeral: !!response.isEphemeral });
    }

}

async function init() {
    // Read config
    const config = readConfig();

    // Setup Discord bot
    const discordClient = new Discord.Client({
        intents: [
            `GUILDS`, `GUILD_EMOJIS_AND_STICKERS`, `GUILD_INTEGRATIONS`, `GUILD_MESSAGES`, `GUILD_MESSAGE_REACTIONS`
        ]
    });
    await discordClient.login(config.discordToken);
    console.log(`Discord ready`);
    discordClient.on("error", console.error);

    const findCommandRegex = /^[/!](\S*)/;

    // Create the find room function with rooms in config
    const findRoom = generateFindRoom(config.rooms);

    discordClient.on("interactionCreate", interaction => {

        if (interaction.isCommand() && interaction.guildId === config.discordGuildId) {
            const command = interaction.commandName;

            const member = interaction.member as Discord.GuildMember;
            const sender = member.nickname || interaction.user.username;

            const room: Room = findRoom(interaction.channelId) ?? {
                name: `discord_tempRoom_${interaction.channelId}`,
                discordId: interaction.channelId,
                safe: true
            };

            const paramsJoinChar = (command === `choose`) ? ";" : " ";

            const params = interaction.options.data.map(option => {
                if (option.type === `STRING` && interaction.channel !== null) {
                    const cleanContent = Util.cleanContent(option.value as string, interaction.channel);
                    return cleanContent;
                }
            }).join(paramsJoinChar);

            const text = `/${command} ${params}`
            const incomingMessage: ChatMessage = { text, room, command, params, sender };

            void processDiscordInteraction(incomingMessage, interaction, config);

        }
    })

    discordClient.on("messageCreate", (message) => {
        if (message.guildId === config.discordGuildId) {
            if (message.cleanContent.startsWith("/") || message.cleanContent.startsWith("!")) {
                const text = message.cleanContent;
                const commandMatch = findCommandRegex.exec(text);

                if (!commandMatch || !commandMatch[1]) return;

                const command = commandMatch[1];

                const params = text.substring(commandMatch[0].length + 1);
                const sender = message.author.username;

                const room: Room = findRoom(message.channel.id) ?? {
                    name: `discord_tempRoom_${message.channelId}`,
                    discordId: message.channelId,
                    safe: true
                };

                const incomingMessage: ChatMessage = { text, room, command, params, sender };

                void processCommand(incomingMessage, config, true, discordClient);
            }
        }

    })

    // Handling features
    void twitter(discordClient, config);

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