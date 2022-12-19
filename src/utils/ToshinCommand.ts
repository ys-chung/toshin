import {
  Discord,
  SimpleCommand,
  type SimpleCommandMessage,
  Slash
} from "discordx"

import type { CommandInteraction } from "discord.js"

export interface BaseToshinCommand {
  answer: (p?: string) => Promise<string> | string
}

export function ToshinCommand(options: {
  name: Lowercase<string>
  description: string
  p?: "required" | "optional"
}) {
  return function <T extends new (...args: any[]) => BaseToshinCommand>(
    constructor: T
  ) {
    @Discord()
    class C extends constructor {
      @SimpleCommand({ name: options.name })
      async replyCommand(command: SimpleCommandMessage) {
        await command.message.reply(await this.answer())
      }

      @Slash({ name: options.name, description: options.description })
      async replyInteraction(i: CommandInteraction) {
        await i.reply(await this.answer())
      }
    }

    return C
  }
}
