import Discord from "discord.js";

export function generateRegisterSlashCommand(discordClient: Discord.Client, discordGuildId: string) {
    return async (commandData: Discord.ApplicationCommandData): Promise<void> => {
        const foundGuild = await discordClient.guilds.fetch(discordGuildId);
        void foundGuild.commands.create(commandData);
    }
}