import { EmbedBuilder } from "@discordjs/builders"

import { Mh } from "../utils/Config.js"
import { sample } from "../utils/utils.js"
import { Log } from "../utils/log.js"

import { ToshinCommand } from "../utils/ToshinCommand.js"

const log = new Log("mh")

@ToshinCommand({
  name: "mh",
  description: "mh sticker pack",
  parameter: { name: "sticker", description: "sticker name", required: false }
})
export class MhCommand {
  mhMap = new Map(Object.entries(Mh))

  answer(paramString?: string) {
    let sticker: string[] | undefined

    if (!paramString) {
      void log.info("No sticker specified, sampling a random sticker")

      sticker = this.mhMap.get(sample([...this.mhMap.keys()]))
    } else {
      sticker = this.mhMap.get(paramString)
    }

    if (!sticker) {
      void log.info("No sticker is found")

      return new EmbedBuilder().setDescription("Sticker not found")
    }

    void log.info("Sticker embed generated")
    return new EmbedBuilder().setImage(sample(sticker))
  }
}
