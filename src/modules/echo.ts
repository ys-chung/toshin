/* eslint-disable @typescript-eslint/require-await */
import { ChatMessage } from "../types/ChatMessage";

export async function echo(message: ChatMessage): Promise<ChatMessage> {
    if (message.command === "echo" && message.params) {
        message.text = `Echo: ${message.params}`;
        return message;
    }

    return Promise.reject();
}