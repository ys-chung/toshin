import { Config } from "./Config.js"

const {
  debug: { webhookUrl, threadId }
} = Config

export function log(
  moduleName: string,
  message: string,
  type: "log" | "error" = "log",
  ...extra: unknown[]
) {
  if (process.env.SILENT === "true") return

  const time = Math.floor(Date.now() / 1000)

  console[type](`${time} [${moduleName}] ${message}`, ...extra)

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
