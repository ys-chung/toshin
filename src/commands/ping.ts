import { type BaseToshinCommand, ToshinCommand } from "../utils/ToshinCommand.js"

@ToshinCommand({ name: "ping", description: "pongs back" })
export class PingCommand implements BaseToshinCommand {
  answer() {
    return "pong"
  }
}