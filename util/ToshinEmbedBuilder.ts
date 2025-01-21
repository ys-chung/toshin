import { EmbedBuilder, type APIEmbed } from "discord.js"

import { Config } from "./Config"

export class ToshinEmbedBuilder extends EmbedBuilder {
  constructor(data?: APIEmbed) {
    if (!data) {
      data = { color: Config.colour }
    }

    if (!data.color) {
      data.color = Config.colour
    }

    super(data)
  }
}
