import { EmoteType } from "./EmoteType";
import _ from "lodash";

export interface Emote {
    content: string | string[] | string[][];
    type: EmoteType;
    verifyParams?: boolean;
}

export type EmoteItems = [string, Emote][];

export function isEmote(candidate: unknown): candidate is Emote {
    const predictate = candidate as Emote;
    return (predictate.type === EmoteType.replacement || predictate.type === EmoteType.simple)
}

export function isEmoteItems(candidate: unknown): candidate is EmoteItems {
    const predicate = candidate as EmoteItems;
    const isArrayInstance = (predicateElement: unknown) => _.isArray(predicateElement);
    const isFirstElementString = (predicateElement: unknown[]) => _.isString(predicateElement[0]);
    const isSecondElementEmote = (predicateElement: unknown[]) => isEmote(predicateElement[1]);

    if (_.isArray(predicate)) {
        if (predicate.every(isArrayInstance) && predicate.every(isFirstElementString) && predicate.every(isSecondElementEmote)) {
            return true;
        }
    }

    return false;
}