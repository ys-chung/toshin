import fs from "fs";
import _ from "lodash";

import { ChatMessage } from "../types/ChatMessage";
import { Emote, EmoteItems, isEmoteItems } from "../types/Emote";
import { EmoteType } from "../types/EmoteType";

function readEmotes(): EmoteItems {
    try {
        const emotesFile = fs.readFileSync("./data/emotes.json").toString();
        const parsedEmotes: unknown = JSON.parse(emotesFile);

        if (!isEmoteItems(parsedEmotes)) throw new Error("Emotes config not formatted correctly.");

        return parsedEmotes;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to read or parse emotes config file.");
    }
}

function generateEmotes() {
    const emotesMap = new Map<string, Emote>(readEmotes());

    return async function emotes(message: ChatMessage): Promise<ChatMessage> {
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
}

export const emotes = generateEmotes();