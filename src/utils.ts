import Discord from "discord.js"
import { CommandMessage } from "./CommandMessage.js";

export function isMessageChannelNsfw(message: Discord.Message | CommandMessage): boolean {
    switch (message.channel.type) {
        case "GUILD_TEXT":
        case "GUILD_NEWS":
            return message.channel.nsfw;
            break;

        case "GUILD_PUBLIC_THREAD":
        case "GUILD_PRIVATE_THREAD":
        case "GUILD_NEWS_THREAD":
            return message.channel.parent?.nsfw ?? false;
            break;

        default:
            return false;
    }
}