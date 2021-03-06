import { ChatMessage } from "../types/ChatMessage";

export async function echo(message: ChatMessage): Promise<ChatMessage> {
    if (message.command === "echo" && message.params !== undefined) {
        message.text = `Echo: ${message.params}`;
        return message;
    }

    return Promise.reject();
}