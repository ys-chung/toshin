import fs from "fs";
import _ from "lodash";
import Discord from "discord.js";

import { Sticker, isStickerPackList } from "../types/Sticker.js";
import { CommandDescription } from "../types/CommandDescription.js";
import { CommandMessage } from "../CommandMessage.js";

function readStickers(): Map<string, Map<string, Sticker>> {
    try {
        const stickersFile = fs.readFileSync("./data/stickers.json").toString();
        const parsedStickers: unknown = JSON.parse(stickersFile);

        if (!isStickerPackList(parsedStickers)) throw new Error("Emotes config not formatted correctly.");

        const stickerPackMapList: Map<string, Map<string, Sticker>> = new Map<string, Map<string, Sticker>>();

        for (const key in parsedStickers) {
            const stickerPackMap = new Map(Object.entries(parsedStickers[key]))
            stickerPackMapList.set(key, stickerPackMap);
        }

        return stickerPackMapList;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to read or parse emotes config file.");
    }
}

function generateDescription() {
    const stickersMap = readStickers();
    const commandDataList: Discord.ApplicationCommandData[] = [];

    stickersMap.forEach((pack, packName) => {
        const commandData: Discord.ApplicationCommandData = {
            name: packName,
            description: `${packName} sticker pack`,
            options: [
                {
                    name: `sticker`,
                    description: `sticker name`,
                    type: `STRING`,
                    required: true
                }
            ]
        }

        commandDataList.push(commandData);
    });

    const desc: CommandDescription = {
        name: `stickers`,
        commands: commandDataList
    }

    return desc
}

export const stickersDescription: CommandDescription = generateDescription();

function generateStickers() {
    const stickersMap = readStickers();

    return async function stickers(message: CommandMessage): Promise<void> {
        if (message.command && message.params !== undefined && message.user) {

            const matchedPack = stickersMap.get(message.command);

            if (matchedPack) {
                const packName = message.command;
                let stickerName: string;
                let prefixStickerName = false;

                if (message.params.length === 0) {
                    const stickerNames = Array.from(matchedPack.keys());
                    const randomStickerName = _.sample(stickerNames);

                    if (!randomStickerName) {
                        throw new Error(`Cannot get a random sticker from pack ${packName}`);
                    }

                    stickerName = randomStickerName;
                    prefixStickerName = true;
                } else {
                    stickerName = message.paramString;
                }

                const stickerFromPack = matchedPack.get(stickerName);

                if (!stickerFromPack) {
                    void message.reply({
                        content: `Cannot find sticker ${stickerName} from pack ${packName}!`,
                        isError: true
                    })
                }

                const selectedSticker = _.sample(stickerFromPack);

                if (!selectedSticker) {
                    throw new Error(`Cannot sample sticker ${stickerName} from pack ${packName}`);
                }

                void message.reply({
                    content: prefixStickerName? `${stickerName}: ${selectedSticker}` : selectedSticker
                })
            }
        }

        return Promise.reject();
    }
}

export const stickers = generateStickers();