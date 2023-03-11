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
  EmbedBuilder,
  type Client
} from "discord.js"

import { Dice } from "@scio/dice-typescript"
import { z } from "zod"

import { ToshinCommand, baseEmbedJson } from "../utils/ToshinCommand.js"
import { Log } from "../utils/log.js"

import { Config } from "../utils/Config.js"

const log = new Log("roll")
const dice = new Dice()

@ToshinCommand({
  name: "roll",
  description: "rolls dice with expression",
  prependEmoji: false,
  parameter: {
    name: "expression",
    description: "dice expression",
    required: true
  }
})
export class RollCommand {
  async answer(paramString: string, client: Client) {
    try {
      const result = dice.roll(paramString)
      let embedDescription =
        result.errors.length > 0
          ? `${Config.emoji}\n\nError: ${result.errors[0].message}`
          : `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**\n\n${result.renderedExpression}`

      if (!paramString.match("d")) {
        const diceCommand =
          client.application?.commands.cache.find((c) => c.name === "dice") ??
          (await client.application?.commands.fetch())?.find(
            (c) => c.name === "dice"
          )

        embedDescription +=
          "\n\nℹ️ your command didn't roll any dice, you might want to use " +
          (diceCommand ? `</dice:${diceCommand?.id ?? ""}>` : "/dice") +
          " instead"
      }

      return new EmbedBuilder().setDescription(embedDescription)
    } catch (error) {
      log.error("Roll error", error)
      return new EmbedBuilder().setDescription("Error: Roll failed")
    }
  }
}

@Discord()
export class DiceCommand {
  @SimpleCommand({
    name: "dice",
    description: "roll a die"
  })
  simpleReply(
    @SimpleCommandOption({
      name: "sides",
      type: SimpleCommandOptionType.Number,
      description: "number of sides of the die"
    })
    sides = 6,
    command: SimpleCommandMessage
  ) {
    void log.info("Got simple command", sides)

    if (z.number().safeParse(sides).success === false) {
      void log.info("Simple command invalid, replying usage syntax")
      return command.sendUsageSyntax()
    }

    const result = dice.roll(`d${sides}`)
    void log.info("Die rolled, replying embed")

    return command.message.reply({
      embeds: [
        new EmbedBuilder(baseEmbedJson).setDescription(
          `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**`
        )
      ]
    })
  }

  @Slash({
    name: "dice",
    description: "roll a die"
  })
  slashReply(
    @SlashOption({
      name: "sides",
      type: ApplicationCommandOptionType.Number,
      description: "number of sides of the die",
      required: false
    })
    sides = 6,
    i: CommandInteraction
  ) {
    void log.info("Got slash command", sides)

    const result = dice.roll(`d${sides}`)
    void log.info("Die rolled, replying embed")

    return i.reply({
      embeds: [
        new EmbedBuilder(baseEmbedJson).setDescription(
          `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**`
        )
      ]
    })
  }
}
