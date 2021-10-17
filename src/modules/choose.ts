import _ from "lodash";

import { CommandMessage } from "../CommandMessage.js";
import { CommandDescription } from "../types/CommandDescription.js";

export async function choose(message: CommandMessage): Promise<void> {
    if ((message.command === "choose" || message.command === "choice") && message.params) {
        const choices = _.split(message.paramString, ";");
        const selectedChoice = _.sample(choices);
        void message.reply({
            content: selectedChoice
        })
    }

    return Promise.reject();
}

export const chooseDescription: CommandDescription = {
    name: "choose",
    commands: [
        {
            name: "choose",
            description: "randomly chooses from a list of things",
            options: [
                {
                    name: "option1",
                    description: "option 1",
                    type: "STRING",
                    required: true
                },
                {
                    name: "option2",
                    description: "option 2",
                    type: "STRING",
                    required: true
                },
                {
                    name: "option3",
                    description: "option 3",
                    type: "STRING"
                },
                {
                    name: "option4",
                    description: "option 4",
                    type: "STRING"
                },
                {
                    name: "option5",
                    description: "option 5",
                    type: "STRING"
                }
            ]
        }
    ]
}