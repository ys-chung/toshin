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
  type AutocompleteInteraction,
  EmbedBuilder
} from "discord.js"

import { throwError } from "./utils.js"

import { Config } from "./Config.js"

export type BaseToshinCommand = {
  answer: (paramString: string) => Promise<EmbedBuilder> | EmbedBuilder
  autocomplete?: (interaction: AutocompleteInteraction) => void
  wrappedAnswer?: never
  replyCommand?: never
  replyInteraction?: never
}

interface ToshinCommandParameter {
  name: Lowercase<string>
  description: string
  required: boolean
  autocomplete?: boolean
}

const baseEmbed = new EmbedBuilder().setColor(Config.colour)
export const baseEmbedJson = baseEmbed.toJSON()

export function ToshinCommand(options: {
  name: Lowercase<string>
  description: string
  parameter: ToshinCommandParameter
}) {
  const { name, description, parameter } = options

  return function <
    T extends new (...args: any[]) => Pick<
      BaseToshinCommand,
      "answer" | "autocomplete"
    >
  >(constructor: T) {
    @Discord()
    class C extends constructor {
      async wrappedAnswer(paramString: string) {
        const embed = {
          ...baseEmbed.toJSON(),
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
          description: parameter.description,
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
          type: ApplicationCommandOptionType.String,
          autocomplete: parameter.autocomplete
        })
        cmdParam: string,
        i: CommandInteraction | AutocompleteInteraction
      ) {
        if (i.isAutocomplete()) {
          return this.autocomplete
            ? this.autocomplete(i)
            : throwError(
                `No autocomplete function provided for command '${name}'`
              )
        }

        return i.reply({
          embeds: [await this.wrappedAnswer(cmdParam)]
        })
      }
    }

    return C
  }
}
