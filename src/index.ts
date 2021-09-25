// Dependencies
import fs from "fs";
import Discord from "discord.js";

// Interfaces
import { ConfigInterface, isConfigInterface } from "./types/ConfigInterface.js";

// Command message
import { CommandMessage } from "./CommandMessage.js";

// Commands
import { echo, echoDescription } from "./modules/echo.js";
import { choose, chooseDescription } from "./modules/choose.js";
import { stickers, stickersDescription } from "./modules/stickers.js";
import { emotes, emotesDescription } from "./modules/emotes.js";

// Features
import { twitter } from "./modules/twitter.js";
import { registerSlashCommands } from "./modules/registerSlashCommands.js";

function readConfig(): ConfigInterface {
    /* =====
    READ CONFIGURATION
    =====*/

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

async function processCommand(commandMessage: CommandMessage, config: ConfigInterface) {
    /* =====
    PROCESS THE COMMAND
    =====*/

    try {
        await Promise.any([
            choose(commandMessage),
            echo(commandMessage),
            emotes(commandMessage, config.moduleConfig.emotes?.allowedParams),
            stickers(commandMessage)
        ]);
    } catch (error) {
        const allErrors = error as AggregateError;
        const allErrorsArray = allErrors.errors;
        if (!(allErrorsArray.every((e) => e === undefined))) {
            console.error(allErrorsArray);
            throw new Error("Error when executing commands");
        }
    }
}

async function init() {
    /* =====
    START INIT
    =====*/

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


    /* =====
    COMMANDS
    ===== */

    // Listen for interactions from Discord
    discordClient.on("interactionCreate", interaction => {
        // Only process interaction if it's a slash command & is from configured guild
        if (interaction.isCommand() && interaction.guildId === config.discordGuildId) {
            const commandMessage = new CommandMessage({
                type: "interaction",
                interaction
            })

            void processCommand(commandMessage, config);
        }
    })

    // Listen for messages from Discord
    discordClient.on("messageCreate", (message) => {
        // Only process message if it's from configured guild
        if (message.guildId === config.discordGuildId) {
            if (message.cleanContent.startsWith("!")) {
                const commandMessage = new CommandMessage({
                    type: "message",
                    message
                })

                // Process the command
                void processCommand(commandMessage, config);
            }
        }
    })


    /* =====
    NON-COMMAND STANDALONE FEATURES
    ===== */

    // Twitter
    void twitter(discordClient, config);

    // Registering slash commands
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

process.on("uncaughtException", exception => {
    console.error(exception)
})