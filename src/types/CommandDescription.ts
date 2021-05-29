import Discord from "discord.js";

export interface CommandDescription {
    name: string,
    commands: Discord.ApplicationCommandData[]
}