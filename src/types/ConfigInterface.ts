import { Room, isRoom } from "./Room";
import _ from "lodash";

type ModuleConfig = Record<string, string>;

export interface ConfigInterface {
    readonly discordToken: string;
    readonly discordGuildId: string;
    readonly telegramToken: string;
    readonly rooms: Room[];
    readonly moduleConfig: Record<string, ModuleConfig>;
}

export function isConfigInterface(candidate: unknown): candidate is ConfigInterface {
    const predicate = candidate as ConfigInterface;
    return (
        _.isString(predicate.discordToken) &&
        _.isString(predicate.telegramToken) &&
        _.has(predicate, "rooms") &&
        _.isArray(predicate.rooms) &&
        predicate.rooms.every(isRoom)
    )
}