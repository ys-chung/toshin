import { Room } from "./Room";

type ModuleConfig = Record<string, string>;

export interface ConfigInterface {
    readonly discordToken: string;
    readonly telegramToken: string;
    readonly rooms: Room[];
    readonly moduleConfig: Record<string, ModuleConfig>;
}