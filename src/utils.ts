import Discord, { ChannelType } from "discord.js"
import { CommandMessage } from "./CommandMessage.js"

export function isMessageChannelAgeRestricted(
    message: Discord.Message | CommandMessage
): boolean {
    switch (message.channel.type) {
        case ChannelType.GuildText:
        case ChannelType.GuildAnnouncement:
            return message.channel.nsfw

        case ChannelType.PublicThread:
        case ChannelType.PrivateThread:
        case ChannelType.AnnouncementThread:
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
