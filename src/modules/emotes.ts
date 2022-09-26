import fs from "fs"
import _ from "lodash"
import Discord, { ApplicationCommandOptionType } from "discord.js"

import { Emote, EmoteType, isEmoteList } from "../types/Emote.js"
import { CommandDescription } from "../types/CommandDescription.js"
import { CommandMessage } from "../CommandMessage.js"

function readEmotes(): Map<string, Emote> {
    try {
        const emotesFile = fs.readFileSync("./data/emotes.json").toString()
        const parsedEmotes: unknown = JSON.parse(emotesFile)

        if (!isEmoteList(parsedEmotes))
            throw new Error("Emotes config not formatted correctly.")

        const emotesMap: Map<string, Emote> = new Map(
            Object.entries(parsedEmotes)
        ) as Map<string, Emote>
        emotesMap.delete("version")

        return emotesMap
    } catch (error) {
        console.error(error)
        throw new Error("Failed to read or parse emotes config file.")
    }
}

function generateDescription() {
    const emotesMap = readEmotes()
    const commandDataList: Discord.ApplicationCommandData[] = []

    emotesMap.forEach((emote, commandName) => {
        const commandData: Discord.ApplicationCommandData = {
            name: commandName,
            description: commandName
        }

        if (emote.type === EmoteType.replacement) {
            if (!_.isArray(emote.content)) {
                throw new Error(
                    `Content in replacement emote "${commandName}" is not an array. Check if emote is miscategorised.`
                )
            }

            commandData.options = [
                {
                    name: "friend",
                    description: `cool friend to ${commandName}`,
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]

            commandData.description = `${commandName} a friend`
        }

        commandDataList.push(commandData)
    })

    const desc: CommandDescription = {
        name: "emote",
        commands: commandDataList
    }

    return desc
}

export const emotesDescription: CommandDescription = generateDescription()

export async function emotes(
    message: CommandMessage,
    allowedParams: string
): Promise<void> {
    const emotesMap = readEmotes()
    let wrapperString

    if (message.command && message.params !== undefined && message.user) {
        // Try to find an emote that matches the command in emotesMap
        const matchedEmote = emotesMap.get(message.command)

        // If an emote matches the command
        if (matchedEmote) {
            let replyText: string | undefined

            // For simple emotes
            if (matchedEmote.type === EmoteType.simple) {
                // If the emote's content is an array
                if (_.isArray(matchedEmote.content)) {
                    // Sample a reply from the array
                    const selectedContent = _.sample(matchedEmote.content)

                    // If the sampled reply is a string
                    if (_.isString(selectedContent)) {
                        replyText = selectedContent
                    } else {
                        // If it is not a string, throw error
                        throw new Error(
                            `Element in content of simple emote "${message.command}" is not a string. Check if emote is miscategorised.`
                        )
                    }
                } else {
                    // If the emote's content is a string, make it the reply
                    replyText = matchedEmote.content
                }
            }

            // For replacement emotes
            if (matchedEmote.type === EmoteType.replacement) {
                if (!_.isArray(matchedEmote.content)) {
                    throw new Error(
                        `Content in replacement emote "${message.command}" is not an array. Check if emote is miscategorised.`
                    )
                }

                if (
                    matchedEmote.verifyParams &&
                    message.paramString.replaceAll("\u200B", "") !== allowedParams
                ) {
                    return Promise.reject()
                }

                const selectedContent = _.sample(matchedEmote.content)

                if (!_.isArray(selectedContent)) {
                    throw new Error(
                        `Element in content of replacement emote "${message.command}" is not an array. Check if emote is miscategorised.`
                    )
                }

                if (selectedContent.length === 2) {
                    replyText = [
                        selectedContent[0],
                        message.paramString,
                        selectedContent[1]
                    ].join("")
                } else if (selectedContent.length === 3) {
                    replyText = [
                        selectedContent[0],
                        message.paramString,
                        selectedContent[1],
                        message.userNickOrUsername,
                        selectedContent[2]
                    ].join("")
                } else if (selectedContent.length === 1) {
                    replyText = selectedContent[0]
                } else {
                    throw new Error(
                        `Array of element in content of replacement emote "${message.command}" is neither 1, 2 or 3 elements long.`
                    )
                }

                wrapperString = "_%_"
            }

            if (replyText === undefined) {
                throw new Error(
                    `Type of emote "${message.command}" is neither "simple" nor "replacement".`
                )
            }

            if (
                replyText.endsWith(".png") ||
                replyText.endsWith(".jpg") ||
                replyText.endsWith(".gif") ||
                replyText.endsWith(".mp4")
            ) {
                void message.reply({
                    files: [
                        {
                            attachment: replyText
                        }
                    ]
                })
            } else {
                void message.reply({
                    content: replyText,
                    wrapperString
                })
            }
        }
    }

    return Promise.reject()
}
