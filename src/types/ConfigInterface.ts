import { Room, isRoom } from "./Room";
import { Snowflake } from "discord.js";
import _ from "lodash";

type ModuleConfig = Record<string, string>;

export interface ConfigInterface {
    readonly discordToken: string;
    readonly discordGuildId: Snowflake;
    readonly telegramToken: string;
    readonly telegramBotUsername: string;
    readonly rooms: Room[];
    readonly moduleConfig: Record<string, ModuleConfig>;
}

export function isConfigInterface(candidate: unknown): candidate is ConfigInterface {
    const predicate = candidate as ConfigInterface;
    return (
        _.isString(predicate.discordToken) &&
        _.isString(predicate.discordGuildId) &&
        _.isString(predicate.telegramToken) &&
        _.isString(predicate.telegramBotUsername) &&
        _.has(predicate, "rooms") &&
        _.isArray(predicate.rooms) &&
        predicate.rooms.every(isRoom)
    )
}