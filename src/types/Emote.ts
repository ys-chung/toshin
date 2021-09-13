import { EmoteType } from "./EmoteType.js";
import _ from "lodash";

export interface Emote {
    content: string | string[] | string[][];
    // description: string;
    type: EmoteType;
    verifyParams?: boolean;
}

export type EmoteList = {
    version: number;
} & {
    [emoteName: string]: Emote;
}

export function isEmote(candidate: unknown): candidate is Emote {
    const predictate = candidate as Emote;
    return ((predictate.type === EmoteType.replacement || predictate.type === EmoteType.simple) && !!predictate.content 
    // && _.isString(predictate.description)
    )
}

export function isEmoteList(candidate: unknown): candidate is EmoteList {
    const predicate = candidate as EmoteList;

    if (!_.isNumber(predicate.version)) { return false }

    for (const key in predicate) {
        if (key === "version") { continue }

        if (!isEmote(predicate[key])) { return false }
    }

    return true;
}