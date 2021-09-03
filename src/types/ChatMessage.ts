import { Room } from "./Room.js";

export interface ChatMessage {
    text: string;
    readonly room: Room;
    readonly command?: string;
    readonly params?: string;
    readonly sender?: string;
    italic?: boolean;
    isEphemeral?: boolean;
    prefix?: string;
    discordEscape?: boolean;
}