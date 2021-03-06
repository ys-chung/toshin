import { Room } from "./Room";

export interface ConfigInterface {
    readonly discordToken: string;
    readonly telegramToken: string;
    readonly twitterBearerToken: string;
    readonly rooms: Room[];
}