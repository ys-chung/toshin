import Discord from "discord.js"
import { CommandMessage } from "./CommandMessage.js"

export function isMessageChannelAgeRestricted(
    message: Discord.Message | CommandMessage
): boolean {
    switch (message.channel.type) {
        case "GUILD_TEXT":
        case "GUILD_NEWS":
            return message.channel.nsfw

        case "GUILD_PUBLIC_THREAD":
        case "GUILD_PRIVATE_THREAD":
        case "GUILD_NEWS_THREAD":
            return message.channel.parent?.nsfw ?? false

        default:
            return false
    }
}

export function wait(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(true), ms)
    })
}
