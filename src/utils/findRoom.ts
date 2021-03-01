import { Room } from "../types/Room";
import _ from "lodash";

export function findRoom(id: string, rooms: Room[]): Room | undefined {
    const match = _.find(rooms, (room: Room) => (room.discordId === id || room.telegramId === id));
    return match;
}