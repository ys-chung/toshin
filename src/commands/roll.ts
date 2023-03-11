import { EmbedBuilder } from "@discordjs/builders"
import { Dice } from "@scio/dice-typescript"

import { ToshinCommand } from "../utils/ToshinCommand.js"
import { Log } from "../utils/log.js"

import { Config } from "../utils/Config.js"

const log = new Log("roll")

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
  readonly dice = new Dice()

  answer(paramString: string) {
    try {
      const result = this.dice.roll(paramString)
      return new EmbedBuilder().setDescription(
        result.errors.length > 0
          ? `${Config.emoji}\n\nError: ${result.errors[0].message}`
          : `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**\n\n${result.renderedExpression}`
      )
    } catch (error) {
      log.error("Roll error", error)
      return new EmbedBuilder().setDescription("Error: Roll failed")
    }
  }
}
