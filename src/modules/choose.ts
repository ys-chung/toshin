/* eslint-disable @typescript-eslint/require-await */
import _ from "lodash";

import { ChatMessage } from "../types/ChatMessage";

export async function choose(message: ChatMessage): Promise<ChatMessage> {
    if ((message.command === "choose" || message.command === "choice") && message.params) {
        const choices = _.split(message.params, ";");
        const selectedChoice = _.sample(choices);

        if (!selectedChoice) return Promise.reject();

        message.text = selectedChoice;
        return message;
    }

    return Promise.reject();
}