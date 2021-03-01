import { Room } from "./Room";

export interface ChatMessage {
    text: string;
    room: Room;
    command?: string;
    params?: string;
    italic?: boolean;
}