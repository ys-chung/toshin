import { EmbedBuilder } from "@discordjs/builders"

import { Mh } from "../utils/Config.js"
import { sample } from "../utils/utils.js"
import { log } from "../utils/log.js"

import {
  ToshinCommand,
  type BaseToshinCommand
} from "../utils/ToshinCommand.js"

@ToshinCommand({
  name: "mh",
  description: "mh sticker pack",
  parameter: { name: "sticker", description: "sticker name", required: false }
})
export class MhCommand implements BaseToshinCommand {
  mhMap = new Map(Object.entries(Mh))

  answer(paramString?: string) {
    let sticker: string[] | undefined

    if (!paramString) {
      void log("mh", "No sticker specified, sampling a random sticker")

      sticker = this.mhMap.get(sample([...this.mhMap.keys()]))
    } else {
      sticker = this.mhMap.get(paramString)
    }

    if (!sticker) {
      void log("mh", "No sticker is found")

      return new EmbedBuilder().setDescription("Sticker not found")
    }

    void log("mh", "Sticker embed generated")
    return new EmbedBuilder().setImage(sample(sticker))
  }
}
