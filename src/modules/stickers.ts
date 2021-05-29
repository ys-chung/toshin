import fs from "fs";
import _ from "lodash";

import { ChatMessage } from "../types/ChatMessage";
import { Sticker, isStickerPackList } from "../types/Sticker";

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
    
}

function generateStickers() {
    const stickersMap = readStickers();

    return async function stickers(message: ChatMessage): Promise<ChatMessage> {
        if (message.command && message.params !== undefined && message.sender) {

            const matchedPack = stickersMap.get(message.command);

            if (matchedPack) {
                const packName = message.command;
                let stickerName: string;
                let prefixStickerName = false;

                if (message.params.length == 0) {
                    const stickerNames = Array.from(matchedPack.keys());
                    const randomStickerName = _.sample(stickerNames);

                    if (!randomStickerName) {
                        throw new Error(`Cannot get a random sticker from pack ${packName}`);
                    }

                    stickerName = randomStickerName;
                    prefixStickerName = true;
                } else {
                    stickerName = message.params;
                }

                const stickerFromPack = matchedPack.get(stickerName);

                if (!stickerFromPack) {
                    message.text = `Cannot find sticker ${stickerName} from pack ${packName}!`
                    return message;
                }

                const selectedSticker = _.sample(stickerFromPack);

                if (!selectedSticker) {
                    throw new Error(`Cannot sample sticker ${stickerName} from pack ${packName}`);
                }

                message.text = prefixStickerName? `${stickerName}: ${selectedSticker}` : selectedSticker;
                return message;
            }
        }

        return Promise.reject();
    }
}

export const stickers = generateStickers();