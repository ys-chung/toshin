import { EmbedBuilder } from "@discordjs/builders"

import {
  ToshinCommand,
  type BaseToshinCommand
} from "../utils/ToshinCommand.js"

@ToshinCommand({
  name: "echo",
  description: "echoes back what you say",
  parameter: { name: "text", description: "text to echo back", required: true }
})
export class EchoCommand implements BaseToshinCommand {
  answer(paramString: string) {
    return new EmbedBuilder().setDescription(`Echo: ${paramString}`)
  }
}
