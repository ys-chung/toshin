import _ from "lodash";

export interface Room {
    readonly name: string;
    readonly discordId?: string;
    readonly telegramId?: string;
    readonly safe: boolean;
}

export function isRoom(candidate: unknown): candidate is Room {
    const predicate = candidate as Room;
    return (
        _.isString(predicate.name) &&
        (_.isUndefined(predicate.discordId) || _.isString(predicate.discordId)) &&
        (_.isUndefined(predicate.telegramId) || _.isString(predicate.telegramId))
    )
}