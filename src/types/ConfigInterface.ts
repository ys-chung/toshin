import { Room } from "./Room";

export interface ConfigInterface {
    discordToken: string;
    telegramToken: string;
    rooms: Room[];
}