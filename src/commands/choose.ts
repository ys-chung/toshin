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
  EmbedBuilder
} from "discord.js"

import { baseEmbedJson } from "../utils/ToshinCommand.js"
import { Config } from "../utils/Config.js"
import { inApprovedGuild } from "../utils/guard.js"
import { Log } from "../utils/log.js"

const COMMAND_NAME = "choose"
const COMMAND_ALIAS = "choice"
const DESCRIPTION = "randomly picks from a list of things"

const log = new Log("choose")

@Discord()
export class ChooseCommand {
  generateEmbedFromChoices(choices: string[]) {
    void log.info("Generating embed from choices")

    const numberedChoices = choices.map(
      (value, index) => `${index + 1}. ${value}`
    )

    const randomChoiceIndex = Math.floor(Math.random() * numberedChoices.length)

    numberedChoices[
      randomChoiceIndex
    ] = `**👉 ${numberedChoices[randomChoiceIndex]} 👈**`

    void log.info("Choice has been sampled")

    return new EmbedBuilder(baseEmbedJson).setDescription(
      [`${Config.emoji} picks...`, numberedChoices.join("\n")].join("\n\n")
    )
  }

  @SimpleCommand({
    name: COMMAND_NAME,
    description: DESCRIPTION,
    aliases: [COMMAND_ALIAS]
  })
  replyCommand(
    @SimpleCommandOption({
      name: "choices",
      type: SimpleCommandOptionType.String,
      description: "choices to choose from, separated by ';'"
    })
    choices: string,
    command: SimpleCommandMessage
  ) {
    if (!command.isValid()) {
      void log.info("Simple command invalid, replying usage syntax")

      return command.sendUsageSyntax()
    }

    void command.message.reply({
      embeds: [this.generateEmbedFromChoices(command.argString.split(";"))]
    })
  }

  @Slash({ name: COMMAND_NAME, description: DESCRIPTION })
  @Slash({ name: COMMAND_ALIAS, description: DESCRIPTION })
  @Guard(inApprovedGuild)
  replyInteraction(
    @SlashOption({
      name: "option1",
      description: "option 1",
      required: true,
      type: ApplicationCommandOptionType.String
    })
    option1: string,
    @SlashOption({
      name: "option2",
      description: "option 2",
      required: true,
      type: ApplicationCommandOptionType.String
    })
    option2: string,
    @SlashOption({
      name: "option3",
      description: "option 3",
      required: false,
      type: ApplicationCommandOptionType.String
    })
    option3: string | undefined,
    @SlashOption({
      name: "option4",
      description: "option 4",
      required: false,
      type: ApplicationCommandOptionType.String
    })
    option4: string | undefined,
    @SlashOption({
      name: "option5",
      description: "option 5",
      required: false,
      type: ApplicationCommandOptionType.String
    })
    option5: string | undefined,
    i: CommandInteraction
  ) {
    const options = [option1, option2, option3, option4, option5].filter(
      (value): value is NonNullable<typeof value> => value !== undefined
    )

    void i.reply({
      embeds: [this.generateEmbedFromChoices(options)]
    })
  }
}
