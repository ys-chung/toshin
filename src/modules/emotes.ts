// import Discord from "discord.js";
import fs from "fs";
import _ from "lodash";
import Discord from "discord.js";

import { ChatMessage } from "../types/ChatMessage";
import { Emote, isEmoteList } from "../types/Emote";
import { EmoteType } from "../types/EmoteType";
import { CommandDescription } from "../types/CommandDescription";

function readEmotes(): Map<string, Emote> {
    try {
        const emotesFile = fs.readFileSync("./data/emotes.json").toString();
        const parsedEmotes: unknown = JSON.parse(emotesFile);

        if (!isEmoteList(parsedEmotes)) throw new Error("Emotes config not formatted correctly.");

        const emotesMap: Map<string, Emote> = new Map(Object.entries(parsedEmotes)) as Map<string, Emote>;
        emotesMap.delete(`version`);

        return emotesMap;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to read or parse emotes config file.");
    }
}

function generateDescription() {
    const emotesMap = readEmotes();
    const commandDataList: Discord.ApplicationCommandData[] = [];

    emotesMap.forEach((emote, commandName) => {
        const commandData: Discord.ApplicationCommandData = {
            name: commandName,
            description: commandName
        }

        if (emote.type === EmoteType.replacement) {
            if (!_.isArray(emote.content)) {
                throw new Error(`Content in replacement emote "${commandName}" is not an array. Check if emote is miscategorised.`);
            }

            commandData.options = [
                {
                    name: `friend`,
                    description: `cool friend to ${commandName}`,
                    type: `STRING`,
                    required: true
                }
            ]

            commandData.description = `${commandName} a friend`;
        }

        commandDataList.push(commandData);
    })

    const desc: CommandDescription = {
        name: `emote`,
        commands: commandDataList
    }

    return desc;
}

export const emotesDescription: CommandDescription = generateDescription();

export async function emotes(message: ChatMessage, allowedParams: string): Promise<ChatMessage> {
    const emotesMap = readEmotes();

    if (message.command && message.params !== undefined && message.sender) {

        // Try to find an emote that matches the command in emotesMap
        const matchedEmote = emotesMap.get(message.command);

        // If an emote matches the command
        if (matchedEmote) {

            let replyText: string | undefined;

            // For simple emotes
            if (matchedEmote.type === EmoteType.simple) {
                // If the emote's content is an array
                if (_.isArray(matchedEmote.content)) {

                    // Sample a reply from the array
                    const selectedContent = _.sample(matchedEmote.content);

                    // If the sampled reply is a string
                    if (_.isString(selectedContent)) {
                        replyText = selectedContent;
                    } else {
                        // If it is not a string, throw error
                        throw new Error(`Element in content of simple emote "${message.command}" is not a string. Check if emote is miscategorised.`);
                    }

                } else {
                    // If the emote's content is a string, make it the reply
                    replyText = matchedEmote.content;
                }
            }

            // For replacement emotes
            if (matchedEmote.type === EmoteType.replacement) {
                if (!_.isArray(matchedEmote.content)) {
                    throw new Error(`Content in replacement emote "${message.command}" is not an array. Check if emote is miscategorised.`);
                }

                if (matchedEmote.verifyParams && message.params !== allowedParams) {
                    return Promise.reject();
                }

                const selectedContent = _.sample(matchedEmote.content);

                if (!_.isArray(selectedContent)) {
                    throw new Error(`Element in content of replacement emote "${message.command}" is not an array. Check if emote is miscategorised.`);
                }

                if (selectedContent.length === 2) {
                    replyText = [selectedContent[0], message.params, selectedContent[1]].join("");
                } else if (selectedContent.length === 3) {
                    replyText = [selectedContent[0], message.params, selectedContent[1], message.sender, selectedContent[2]].join("");
                } else if (selectedContent.length === 1) {
                    replyText = selectedContent[0];
                } else {
                    throw new Error(`Array of element in content of replacement emote "${message.command}" is neither 1, 2 or 3 elements long.`)
                }

                message.italic = true;
            }

            if (replyText === undefined) {
                throw new Error(`Type of emote "${message.command}" is neither "simple" nor "replacement".`);
            }

            message.text = replyText;
            return message;
        }
    }

    return Promise.reject();
}