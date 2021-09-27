import { ConfigInterface } from "../types/ConfigInterface.js";
import Discord from "discord.js";

export async function emoji(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    console.log("Emoji loading!")

    const guild = await discordClient.guilds.fetch(config.discordGuildId);

    console.log("Emoji guild found!")

    const allEmojis = await guild.emojis.fetch();

    const selectOptions: Discord.MessageSelectOptionData[] = allEmojis.filter(emoji => {
        return (
            emoji.animated !== null &&
            emoji.name !== null &&
            emoji.id !== null &&
            emoji.animated
        )
    }).map(guildEmoji => {
        console.log(guildEmoji.id)
        return {
            label: guildEmoji.name ?? "",
            value: `emoji:${guildEmoji.id ?? ""}`,
            emoji: guildEmoji,
            default: false,
            description: "this one?"
        }
    })

    const createdCommand = await guild.commands.create({
        name: "React with emoji",
        type: "MESSAGE"
    })

    const commandId = createdCommand.id;

    discordClient.on("interactionCreate", async interaction => {
        if (interaction.isContextMenu()) {
            if (interaction.commandId === commandId) {
                void interaction.reply({
                    content: "Which emoji?",
                    ephemeral: true,
                    components: [
                        {
                            type: "ACTION_ROW",
                            components: [
                                {
                                    type: "SELECT_MENU",
                                    options: selectOptions.map(item => {
                                        item.value += `:${interaction.targetId}`;
                                        return item
                                    }),
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
                console.log(optionArr);
                const wantedMessage = await interaction.channel?.messages.fetch(optionArr[2])
                void wantedMessage?.react(optionArr[1]);
                void interaction.update({
                    content: "Emoji replied!",
                    components: []
                })
            }
        }
    })
}