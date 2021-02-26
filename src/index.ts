import fs from "fs";
import Discord from "discord.js";
import TelegramBot from "node-telegram-bot-api";

import { ConfigInterface } from "./types/ConfigInterface";

import { echo } from "./modules/echo";

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
}

void init();