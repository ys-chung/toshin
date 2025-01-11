import { defineCmd } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"

defineCmd({
  name: "choose",
  aliases: ["choice"],
  description: "randomly picks from a list of things",
  params: [1, 2, 3, 4, 5, 6].map((i) => ({
    name: `option${i}`,
    description: `option ${i}`,
    required: i <= 2
  })),
  flatParams: true,
  splitChar: ";",
  run: (interaction) => {
    const choices = interaction.paramString.split(";")
    const chosenIndex = Math.floor(Math.random() * choices.length)

    const embed = new ToshinEmbedBuilder({
      description: choices
        .map((choice, i) =>
          i === chosenIndex
            ? `**👉 ${i + 1}. ${choice} 👈**`
            : `${i + 1}. ${choice}`
        )
        .join("\n")
    })

    interaction.reply({
      embeds: [embed]
    })
  }
})
