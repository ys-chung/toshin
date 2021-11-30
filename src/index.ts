// Dependencies
import fs from "fs";
import Discord from "discord.js";
import _ from "lodash";

// Interfaces
import { ConfigInterface, isConfigInterface } from "./types/ConfigInterface.js";

// Command message
import { CommandMessage } from "./CommandMessage.js";

// Commands
import { echo, echoDescription } from "./modules/echo.js";
import { choose, chooseDescription } from "./modules/choose.js";
import { stickers, stickersDescription } from "./modules/stickers.js";
import { emotes, emotesDescription } from "./modules/emotes.js";
import { pixiv, pixivDescription, pixivActive } from "./modules/pixiv.js"
import { debugActive, debugDescription } from "./modules/debug.js"

// Features
import { twitter } from "./modules/twitter.js";
import { emoji, emojiDescription } from "./modules/emoji.js"

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

async function processCommand(commandMessage: CommandMessage, config: ReturnType<typeof readConfig>) {
    /* =====
    PROCESS THE COMMAND
    =====*/

    try {
        await Promise.any([
            choose(commandMessage),
            echo(commandMessage),
            emotes(commandMessage, config.moduleConfig.emotes?.allowedParams),
            stickers(commandMessage),
            pixiv(commandMessage, config.moduleConfig.pixiv?.endpoint)
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
            "GUILDS", "GUILD_EMOJIS_AND_STICKERS", "GUILD_INTEGRATIONS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"
        ]
    });
    await discordClient.login(config.discordToken);
    console.log("Discord ready");
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

                void processCommand(commandMessage, config);
            }
        }
    })

    /* =====
    REGISTER ALL COMMANDS
    ===== */

    const guild = await discordClient.guilds.fetch(config.discordGuildId);

    const slashCommandData = _.flatten([
        emotesDescription,
        echoDescription,
        chooseDescription,
        stickersDescription,
        pixivDescription
    ].map(desc => desc.commands));

    const otherCommandData = _.flatten([
        emojiDescription,
        // catDescription,
        debugDescription
    ].map(desc => desc.commands));

    if (slashCommandData.length > 200) {
        throw new Error(`Command list length larger than 200 (${slashCommandData.length})!`);
    }

    console.log(`Starting to register commands, length: ${slashCommandData.length}`);

    await guild.commands.set(_.cloneDeep((_.concat(_.slice(slashCommandData, 0, 100), otherCommandData))));

    console.log("Registered guild slash commands");

    if (slashCommandData.length > 100) {
        if (discordClient.application) {
            await discordClient.application?.commands.set(_.cloneDeep(_.slice(slashCommandData, 100, 200)));

            console.log("Registered global slash commands");
        } else {
            throw new Error("Command list length >100, but client application is not found!")
        }
    }

    /* =====
    NON-COMMAND STANDALONE FEATURES
    ===== */

    // Twitter
    void twitter(discordClient, config);

    // Pixiv (Active mode)
    void pixivActive(discordClient, config);

    // Emoji
    void emoji(discordClient, config);

    // Debug
    void debugActive(discordClient, config);

    /* =====
    LEAVE NON CONFIGURED GUILDS
    =====*/

    const botGuilds = await discordClient.guilds.fetch()

    for (const botGuild of botGuilds.values()) {
        if (botGuild.id !== config.discordGuildId) {
            const fetchedGuild = await discordClient.guilds.fetch(botGuild.id);
            await fetchedGuild.leave()
            console.log(`Left non-configured guild "${fetchedGuild.name}" (${fetchedGuild.id})`)
        }
    }
}

void init();