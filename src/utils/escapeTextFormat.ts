import { BotType } from "../types/BotType.js";

export function escapeTextFormat(text: string, botType: BotType): string {
    let regex: RegExp;

    if (botType === BotType.Discord) {
        regex = /([_\\*~])/g;
    } else if (botType === BotType.Telegram) {
        regex = /([_*[\]()~`>#+\-=|{}.!])/g;
    } else {
        throw new Error("botType is neither Discord nor Telegram");
    }

    return text.replace(regex, "\\$1");
}