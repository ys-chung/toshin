export interface Room {
    readonly name: string;
    readonly discordId?: string;
    readonly telegramId?: string;
    readonly safe: boolean;
}