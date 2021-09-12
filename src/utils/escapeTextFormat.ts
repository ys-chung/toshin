import { BotType } from "../types/BotType";

export function escapeTextFormat(text: string, botType: BotType): string {
    let regex: RegExp;

    if (botType === BotType.Discord) {
        regex = /([_\\*~])/g;
    } else {
        throw new Error("botType is not Discord");
    }

    return text.replace(regex, "\\$1");
}