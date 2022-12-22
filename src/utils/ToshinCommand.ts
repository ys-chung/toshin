import {
  Discord,
  SimpleCommand,
  type SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption
} from "discordx"

import {
  ApplicationCommandOptionType,
  type CommandInteraction,
  EmbedBuilder
} from "discord.js"

import { Config } from "./Config.js"

export type BaseToshinCommand = {
  answer: (paramString: string) => Promise<EmbedBuilder> | EmbedBuilder
}

interface ToshinCommandParameter {
  name: Lowercase<string>
  description: string
  required: boolean
}

const defaultEmbed = new EmbedBuilder().setColor(Config.colour).toJSON()

export function ToshinCommand(options: {
  name: Lowercase<string>
  description: string
  parameter: ToshinCommandParameter
}) {
  const { name, description, parameter } = options

  return function <T extends new (...args: any[]) => BaseToshinCommand>(
    constructor: T
  ) {
    @Discord()
    class C extends constructor {
      async wrappedAnswer(paramString: string) {
        const embed = {
          ...defaultEmbed,
          ...(await this.answer(paramString)).toJSON()
        }
        embed.description = embed.description
          ? `${Config.emoji}\n\n${embed.description}`
          : Config.emoji
        return embed
      }

      @SimpleCommand({ name })
      async replyCommand(
        @SimpleCommandOption({
          name: parameter.name,
          type: SimpleCommandOptionType.String
        })
        cmdParam: string,
        command: SimpleCommandMessage
      ) {
        if (parameter.required && !command.isValid()) {
          return command.sendUsageSyntax()
        }

        return command.message.reply({
          embeds: [await this.wrappedAnswer(cmdParam)]
        })
      }

      @Slash({ name, description })
      async replyInteraction(
        @SlashOption({
          name: parameter.name,
          description: parameter.description,
          required: parameter.required,
          type: ApplicationCommandOptionType.String
        })
        cmdParam: string,
        i: CommandInteraction
      ) {
        return i.reply({
          embeds: [await this.wrappedAnswer(cmdParam)]
        })
      }
    }

    return C
  }
}
