import { defineCmd } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"

defineCmd({
  name: "echo",
  description: "echoes back what you said",
  params: [
    {
      name: "message",
      description: "message to echo",
      required: true
    }
  ],
  flatParams: true,
  run: (interaction) => {
    const embed = new ToshinEmbedBuilder({
      description: `Echo: ${interaction.paramString}`
    })

    interaction.reply({
      embeds: [embed]
    })
  }
})
