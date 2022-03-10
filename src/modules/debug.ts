import Discord from "discord.js"

import { CommandDescription } from "../types/CommandDescription.js"
import { ConfigInterface } from "../types/ConfigInterface.js"

export async function debugPassive(
    discordClient: Discord.Client,
    config: ConfigInterface
): Promise<void> {
    discordClient.on("interactionCreate", async (interaction) => {
        if (interaction.isContextMenu() && interaction.commandName === "Debug: Menu") {
            if (interaction.user.id === config.moduleConfig.debug?.authorisedUser) {
                const targetId = interaction.targetId

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
                                    style: "SECONDARY"
                                },
                                {
                                    type: "BUTTON",
                                    label: "Dump Message Info",
                                    customId: `dumpmessageinfo:${targetId}`,
                                    style: "SECONDARY"
                                },
                                {
                                    type: "BUTTON",
                                    label: "Delete Message",
                                    customId: `deletemessage:${targetId}`,
                                    style: "SECONDARY"
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
                })
            }
        }

        if (interaction.isButton()) {
            const buttonCommandName = interaction.customId.split(":")[0]

            switch (buttonCommandName) {
                case "removeinteractions": {
                    const targetMessageId = interaction.customId.split(":")[1]
                    const targetMessage = await interaction.channel?.messages.fetch(
                        targetMessageId
                    )
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

                    break
                }

                case "dumpmessageinfo": {
                    const targetMessageId = interaction.customId.split(":")[1]
                    const targetMessage = await interaction.channel?.messages.fetch(
                        targetMessageId
                    )

                    void interaction.reply({
                        files: [
                            {
                                attachment: Buffer.from(
                                    JSON.stringify(targetMessage, null, 2)
                                ),
                                name: `${targetMessageId}.json`
                            }
                        ],
                        ephemeral: true
                    })

                    break
                }

                case "deletemessage": {
                    const targetMessageId = interaction.customId.split(":")[1]
                    const targetMessage = await interaction.channel?.messages.fetch(
                        targetMessageId
                    )
                    const deleteable = discordClient.user?.id
                        ? targetMessage?.author.id === discordClient.user?.id &&
                          targetMessage.deletable
                        : false

                    if (deleteable) {
                        await targetMessage?.delete()

                        void interaction.reply({
                            content: "The message has been deleted.",
                            ephemeral: true
                        })
                    } else {
                        void interaction.reply({
                            content: "I cannot delete the message.",
                            ephemeral: true
                        })
                    }

                    break
                }

                default: {
                    return
                }
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
