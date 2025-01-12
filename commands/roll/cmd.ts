import { defineCmd } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"
import { Config } from "../../util/Config"

import { Dice } from "@scio/dice-typescript"
const dice = new Dice()

defineCmd({
  name: "roll",
  description: "rolls dice with expression",
  params: [
    {
      name: "expression",
      description: "dice expression",
      required: true
    }
  ],
  flatParams: true,
  run: (interaction) => {
    const { paramString } = interaction

    try {
      const result = dice.roll(paramString)
      let embedDescription =
        result.errors.length > 0
          ? `${Config.emoji}\n\nError: ${result.errors[0].message}`
          : `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**\n\n${result.renderedExpression}`

      if (!paramString.match("d")) {
        // TODO: fetch slash command and make this interactive
        embedDescription +=
          "\n\nℹ️ your command didn't roll any dice, you might want to use /dice instead"
      }

      interaction.reply({
        embeds: [new ToshinEmbedBuilder().setDescription(embedDescription)]
      })
    } catch (error) {
      console.error("Roll error", error)
      interaction.reply({
        embeds: [new ToshinEmbedBuilder().setDescription("Error: Roll failed")]
      })
    }
  }
})

defineCmd({
  name: "dice",
  description: "rolls a die",
  params: [
    {
      name: "sides",
      description: "number of sides of the die",
      required: false
    }
  ],
  flatParams: true,
  run: (interaction) => {
    let { paramString } = interaction

    // If paramString isn't provided, use default value
    if (!paramString || paramString === "") {
      paramString = "6"
    }

    // Check if paramString is a number
    if (!paramString.match(/^\d+$/)) {
      interaction.reply({
        embeds: [
          new ToshinEmbedBuilder().setDescription(
            "Error: Sides must be a number!"
          )
        ]
      })
      return
    }

    try {
      const result = dice.roll(`d${paramString}`)
      interaction.reply({
        embeds: [
          new ToshinEmbedBuilder().setDescription(
            `${Config.emoji} rolls 🎲 ...\n\n**👉 ${result.total}! 👈**`
          )
        ]
      })
    } catch (error) {
      console.error("Roll error", error)
      interaction.reply({
        embeds: [new ToshinEmbedBuilder().setDescription("Error: Roll failed")]
      })
    }
  }
})
