import Discord from "discord.js";
import _ from "lodash";

import { ConfigInterface } from "../types/ConfigInterface.js";
import { CommandDescription } from "../types/CommandDescription.js";

async function fetchAnimatedEmojis(guild: Discord.Guild): Promise<Discord.MessageSelectOptionData[]> {
    const emojis = await guild.emojis.fetch();

    const allAnimatedEmojis = emojis.filter(emoji => emoji.animated ?? false);

    const allOptions = allAnimatedEmojis.map(guildEmoji => {
        return {
            label: guildEmoji.name ?? "",
            value: `emoji:${guildEmoji.id ?? ""}`,
            emoji: guildEmoji,
            default: false,
            description: "emoji"
        }
    });

    return allOptions;
}

function generateSelectOptions(allOptions: Discord.MessageSelectOptionData[], page = 0, targetId: string): Discord.MessageSelectOptionData[] {
    const offset = 23 * page;
    const options = _.slice(allOptions, offset, offset + 23);

    if (page > 0) {
        options.unshift({
            label: "previous page",
            value: `emoji:page${page - 1}`,
            default: false,
            description: "more emojis"
        })
    }

    if (allOptions[offset + 23 + 1]) {
        options.push({
            label: "next page",
            value: `emoji:page${page + 1}`,
            default: false,
            description: "more emojis"
        })
    }

    return options.map(option => {
        option.value += `:${targetId}`;
        return option
    })
}

export async function emoji(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    console.log("Emoji loading!")

    const guild = await discordClient.guilds.fetch(config.discordGuildId);

    console.log("Emoji guild found!")

    let allOptions = await fetchAnimatedEmojis(guild);

    discordClient.on("emojiCreate", async () => { allOptions = await fetchAnimatedEmojis(guild) });
    discordClient.on("emojiDelete", async () => { allOptions = await fetchAnimatedEmojis(guild) });
    discordClient.on("emojiUpdate", async () => { allOptions = await fetchAnimatedEmojis(guild) });

    discordClient.on("interactionCreate", async interaction => {
        if (interaction.isContextMenu()) {
            if (interaction.command?.name === "React animated emoji") {
                void interaction.reply({
                    content: "which animated emoji would you like me to react with?",
                    ephemeral: true,
                    components: [
                        {
                            type: "ACTION_ROW",
                            components: [
                                {
                                    type: "SELECT_MENU",
                                    options: generateSelectOptions(allOptions, 0, interaction.targetId),
                                    customId: "emojireactmenu"
                                }
                            ]
                        }
                    ]
                })
            }
        }

        if (interaction.isSelectMenu() && interaction.values.length === 1) {
            console.log(interaction.values);
            if (interaction.values[0].startsWith("emoji:")) {
                const optionArr = interaction.values[0].split(":");

                if (optionArr[1].match(/^page\d$/)) {
                    const newPageIndex = optionArr[1].match(/^page(\d)$/)?.[1];

                    if (newPageIndex !== undefined) {

                        void interaction.update({
                            components: [
                                {
                                    type: "ACTION_ROW",
                                    components: [
                                        {
                                            type: "SELECT_MENU",
                                            options: generateSelectOptions(allOptions, Number(newPageIndex), optionArr[2]),
                                            customId: "emojireactmenu"
                                        }
                                    ]
                                }
                            ]
                        })

                    } else {

                        void interaction.update({
                            content: "Failed to load the requested page! Please try again.",
                            components: []
                        })

                    }

                } else {
                    const wantedMessage = await interaction.channel?.messages.fetch(optionArr[2])

                    void wantedMessage?.react(optionArr[1]);

                    void interaction.update({
                        content: "Success! 👍",
                        components: []
                    })
                }
            }
        }
    })
}

export const emojiDescription: CommandDescription = {
    name: `pixiv`,
    commands: [
        {
            name: "React animated emoji",
            type: "MESSAGE"
        }
    ]
}