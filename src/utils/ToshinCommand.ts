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
import { Log } from "./log.js"

import { Config } from "./Config.js"

export type BaseToshinCommand = {
  answer: (paramString: string) => Promise<EmbedBuilder> | EmbedBuilder
  autocomplete?: (interaction: AutocompleteInteraction) => void
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
  defer?: boolean
  prependEmoji?: boolean
}) {
  const { name, description, parameter } = options

  // eslint-disable-next-line sonarjs/cognitive-complexity
  return function <T extends new (...args: any[]) => BaseToshinCommand>(
    constructor: T
  ) {
    const log = new Log(name)

    const commandOptions = { name, description }
    const commandOptionOptions = {
      name: parameter.name,
      description: parameter.description,
      required: parameter.required,
      autocomplete: parameter.autocomplete
    }

    @Discord()
    class _WrappedCommand {
      #original = new constructor()

      async wrappedAnswer(paramString: string) {
        void log.info(
          `Processing command${
            paramString ? " with params " + paramString : ""
          }`
        )

        const embed = {
          ...baseEmbed.toJSON(),
          ...(await this.#original.answer(paramString)).toJSON()
        }

        if (options.prependEmoji !== false) {
          embed.description = embed.description
            ? `${Config.emoji}\n\n${embed.description}`
            : Config.emoji
        }

        void log.info("Command reply generated")

        return embed
      }

      @SimpleCommand(commandOptions)
      @Guard(inApprovedGuild)
      async replyCommand(
        @SimpleCommandOption({
          ...commandOptionOptions,
          type: SimpleCommandOptionType.String
        })
        _paramContent: string,
        command: SimpleCommandMessage
      ) {
        if (parameter.required && !command.isValid()) {
          void log.info(name, "Simple command invalid, replying usage syntax")

          return command.sendUsageSyntax()
        }

        return command.message.reply({
          embeds: [await this.wrappedAnswer(command.argString)]
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
          void log.info(name, "Processing autocomplete")

          return this.#original.autocomplete
            ? this.#original.autocomplete(i)
            : throwError(
                `No autocomplete function provided for command '${name}'`
              )
        }

        if (options.defer) {
          await i.deferReply()

          return i.editReply({
            embeds: [await this.wrappedAnswer(cmdParam)]
          })
        }

        return i.reply({
          embeds: [await this.wrappedAnswer(cmdParam)]
        })
      }
    }

    return constructor
  }
}
