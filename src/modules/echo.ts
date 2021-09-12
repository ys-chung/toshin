import { ChatMessage } from "../types/ChatMessage";
import { CommandDescription } from "../types/CommandDescription";

export async function echo(message: ChatMessage): Promise<ChatMessage> {
    if (message.command === "echo" && message.params !== undefined) {
        message.text = `Echo: ${message.params}`;
        return message;
    }

    return Promise.reject();
}

export const echoDescription: CommandDescription = {
    name: `echo`,
    commands: [
        {
            name: `echo`,
            description: `echoes back what you say`,
            options: [
                {
                    name: `text`,
                    description: `text to echo back`,
                    type: `STRING`,
                    required: true
                }
            ]
        }
    ]
}