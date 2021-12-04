import Discord, { ApplicationCommandData } from "discord.js"
import { fetch } from "fetch-h2"
import * as Booru from "booru"
import _ from "lodash"

import { CommandDescription } from "../types/CommandDescription.js"
import { CommandMessage } from "../CommandMessage.js"
import { isBooruTags } from "../types/BooruTags.js"
import { ConfigInterface } from "../types/ConfigInterface.js"

export async function booru(message: CommandMessage, config: ConfigInterface): Promise<void> {
    const aliases = config.moduleConfig.booru;

    if (message.command === "sb" || message.command === "db" || _.has(aliases, message.command)) {

        if (_.has(aliases, message.command)) {
            const foundTag = _.get(aliases, message.command)
            if (foundTag) {
                message.params.push(foundTag)
            }
        }


        if (message.params.length > 12) {
            void message.reply({
                content: "The number of tags must be below 12.",
                isError: true
            })
        }

        await message.deferReply();

        const results = await Booru.search("sb", message.params, { limit: 1, random: true });

        if (results.length > 0) {
            const post = results[0]
            const imageUrl = post.sampleUrl ?? post.fileUrl

            if (imageUrl === null) {
                void message.reply({
                    content: `No images found for post ${post.id}.`,
                    isError: true
                })

                return
            }

            void message.forceReply({
                content: `${post.id}\n<${Booru.forSite("sb").postView(post.id)}>`,
                files: [imageUrl]
            })

        } else {

            void message.forceReply({
                content: `No images found for tag(s) "${message.paramString}"".`,
                isError: true
            })

        }

    }
}

export async function booruAutocomplete(discordClient: Discord.Client, config: ConfigInterface) {
    const aliases = config.moduleConfig.booru;

    discordClient.on("interactionCreate", async interaction => {
        if (interaction.isAutocomplete() &&
            (interaction.commandName === "sb" || interaction.commandName === "db" || _.has(aliases, interaction.commandName))
        ) {
            const tags = interaction.options.get("tags")?.value

            if (_.isString(tags)) {
                const tagsArr = tags.split(" ")

                if (tagsArr.length > 0) {
                    const lastTag = tagsArr[tagsArr.length - 1]
                    const prevTags = _.dropRight(tagsArr).join(" ")

                    let res;
                    try {
                        res = await fetch(`https://safebooru.org/autocomplete.php?q=${lastTag}`)
                    } catch (error) {
                        console.error(error)
                        return
                    }

                    if (res.ok) {
                        const tagsJson: unknown = await res.json();

                        if (!isBooruTags(tagsJson)) return

                        void interaction.respond(tagsJson.map(val => {
                            const thisOpt = [prevTags, val.value].join(" ")
                            return {
                                name: thisOpt,
                                value: thisOpt
                            }
                        }))
                    }
                } else if (tagsArr.length > 12) {
                    const response = _.slice(tagsArr, 0, 11).join(" ")
                    void interaction.respond([{ name: response, value: response }])
                }
            }
        }
    })
}

export function booruDescriptionGenerator(config: ConfigInterface): CommandDescription {
    const aliases = config.moduleConfig.booru;
    const commands: ApplicationCommandData[] = [
        {
            name: "sb",
            description: "search booru",
            options: [
                {
                    name: "tags",
                    description: "tags to search for",
                    type: "STRING",
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            name: "db",
            description: "search booru",
            options: [
                {
                    name: "tags",
                    description: "tags to search for",
                    type: "STRING",
                    required: true,
                    autocomplete: true
                }
            ]
        }
    ]

    for (const [key] of Object.entries(aliases)) {
        commands.push({
            name: key,
            description: `find a ${key}`,
            options: [
                {
                    name: "tags",
                    description: "extra tags to search for",
                    type: "STRING",
                    required: false,
                    autocomplete: true
                }
            ]
        })
    }

    return {
        name: "booru",
        commands
    }
}