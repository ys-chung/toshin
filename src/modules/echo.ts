import { CommandMessage } from "../CommandMessage.js";
import { CommandDescription } from "../types/CommandDescription.js";

export async function echo(message: CommandMessage): Promise<void> {
    if (message.command === "echo" && message.paramString !== undefined) {
        void message.reply({
            content: `Echo: ${message.paramString}`
        });
    }
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