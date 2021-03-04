import { Room } from "../types/Room";
import _ from "lodash";

export function generateFindRoom(rooms: Room[]) {
    return (id: string): Room | undefined => {
        const match = _.find(rooms, (room: Room) => (room.discordId === id || room.telegramId === id));
        return match;
    }
}