import { fetch } from "fetch-h2"

import { Config } from "./Config.js"

const {
  debug: { webhookUrl, threadId }
} = Config

function log(
  moduleName: string,
  message: string,
  type: "log" | "error" = "log",
  sendWh: boolean,
  ...extra: unknown[]
) {
  if (process.env.SILENT === "true") return

  const time = Math.floor(Date.now() / 1000)

  console[type](`${time} [${moduleName}] ${message}`, ...extra)

  if (!sendWh) return
  
  const whStr = [
    `[${moduleName}] <t:${time}:d> <t:${time}:T>`,
    `${type === "error" ? "⚠️ " : ""}${message.replaceAll("<@", "< @")}`,
    ...extra
      .flatMap((item) => {
        if (typeof item === "string") return item
        if (typeof item === "number") return item.toString()
        if (item instanceof Error) return [item.message, item.stack]
      })
      .filter(
        (value): value is NonNullable<typeof value> => value !== undefined
      )
  ].join("\n")

  try {
    void fetch(webhookUrl + "?thread_id=" + threadId, {
      method: "POST",
      body: JSON.stringify({
        content: whStr
      }),
      headers: {
        "Content-Type": "application/json"
      }
    })
  } catch (error) {
    console.error(error)
  }
}

export class Log {
  #moduleName: string
  #sendWh: boolean

  constructor(moduleName: string) {
    this.#moduleName = moduleName
    this.#sendWh = webhookUrl.startsWith("https")
  }

  info(message: string, ...extra: unknown[]) {
    void log(this.#moduleName, message, "log", this.#sendWh, ...extra)
  }

  error(message: string, ...extra: unknown[]) {
    void log(this.#moduleName, message, "error", this.#sendWh, ...extra)
  }
}
