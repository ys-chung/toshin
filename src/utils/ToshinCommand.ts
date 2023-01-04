import {
  Discord,
  SimpleCommand,
  type SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
  Guard
} from "discordx"

import {
  ApplicationCommandOptionType,
  type CommandInteraction,
  type AutocompleteInteraction,
  EmbedBuilder
} from "discord.js"

import { throwError } from "./utils.js"
import { inApprovedGuild } from "./guard.js"
import { log } from "./log.js"

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
    const commandOptions = { name, description }
    const commandOptionOptions = {
      name: parameter.name,
      description: parameter.description,
      required: parameter.required,
      autocomplete: parameter.autocomplete
    }

    @Discord()
    class C extends constructor {
      async wrappedAnswer(paramString: string) {
        void log(
          name,
          `Processing command${
            paramString ? " with params " + paramString : ""
          }`
        )

        const embed = {
          ...baseEmbed.toJSON(),
          ...(await this.answer(paramString)).toJSON()
        }
        embed.description = embed.description
          ? `${Config.emoji}\n\n${embed.description}`
          : Config.emoji

        void log(name, "Command reply generated")

        return embed
      }

      @SimpleCommand(commandOptions)
      @Guard(inApprovedGuild)
      async replyCommand(
        @SimpleCommandOption({
          ...commandOptionOptions,
          type: SimpleCommandOptionType.String
        })
        cmdParam: string,
        command: SimpleCommandMessage
      ) {
        if (parameter.required && !command.isValid()) {
          void log(name, "Simple command invalid, replying usage syntax")

          return command.sendUsageSyntax()
        }

        return command.message.reply({
          embeds: [await this.wrappedAnswer(cmdParam)]
        })
      }

      @Slash(commandOptions)
      @Guard(inApprovedGuild)
      async replyInteraction(
        @SlashOption({
          ...commandOptionOptions,
          type: ApplicationCommandOptionType.String
        })
        cmdParam: string,
        i: CommandInteraction | AutocompleteInteraction
      ) {
        if (i.isAutocomplete()) {
          void log(name, "Processing autocomplete")

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
