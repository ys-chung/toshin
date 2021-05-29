import Discord from "discord.js";
import _ from "lodash";

import { CommandDescription } from "../types/CommandDescription";

export async function registerSlashCommands(discordClient: Discord.Client, discordGuildId: string, descriptions: CommandDescription[]): Promise<void> {

    const foundGuild = await discordClient.guilds.fetch(discordGuildId);

    const allCommandData = _.flatten(descriptions.map(desc => desc.commands));

    if (allCommandData.length > 100) {
        throw new Error(`Command list length larger than 100!`);
    }

    console.log(`Registering slash commands, length: ${allCommandData.length}`);
    
    void foundGuild.commands.set(allCommandData);
}