import { EmbedBuilder, type APIEmbed } from "discord.js"

export class ToshinEmbedBuilder extends EmbedBuilder {
  constructor(data?: APIEmbed) {
    if (!data) {
      data = { color: 0xff0000 }
    }

    if (!data.color) {
      data.color = 0xff0000
    }

    super(data)
  }
}
