import Discord from "discord.js";

import { CommandDescription } from "../types/CommandDescription.js";
import { ConfigInterface } from "../types/ConfigInterface.js";

export async function debugActive(discordClient: Discord.Client, config: ConfigInterface): Promise<void> {
    discordClient.on("interactionCreate", async interaction => {
        if (interaction.isContextMenu() && interaction.commandName === "Debug: Menu") {
            if (interaction.user.id === config.moduleConfig.debug?.authorisedUser) {
                const targetId = interaction.targetId;

                void interaction.reply({
                    content: "Debug Menu",
                    components: [
                        {
                            type: "ACTION_ROW",
                            components: [
                                {
                                    type: "BUTTON",
                                    label: "Remove All Reactions",
                                    customId: `removeinteractions:${targetId}`,
                                    style: "DANGER"
                                }
                            ]
                        }
                    ],
                    ephemeral: true
                })
            } else {
                void interaction.reply({
                    content: "sorry, you are not authorised to perform this action.",
                    ephemeral: true
                });
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("removeinteractions:")) {
                const targetMessageId = interaction.customId.split(":")[1]
                const targetMessage = await interaction.channel?.messages.fetch(targetMessageId);
                const targetMessageReactions = targetMessage?.reactions.cache.values()

                if (targetMessageReactions) {
                    for (const reaction of Array.from(targetMessageReactions)) {
                        await reaction.users.fetch()
                        if (reaction.me) {
                            await reaction.users.remove()
                        }
                    }
                }

                void interaction.reply({
                    content: "All reactions by me has been removed.",
                    ephemeral: true
                })
            }
        }
    })
}

export const debugDescription: CommandDescription = {
    name: "debug",
    commands: [
        {
            name: "Debug: Menu",
            type: "MESSAGE"
        }
    ]
}