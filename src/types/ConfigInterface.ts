import { Room } from "./Room";

export interface ConfigInterface {
    readonly discordToken: string;
    readonly telegramToken: string;
    readonly rooms: Room[];
}