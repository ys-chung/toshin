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
  const dateStr = Date.now().toString().slice(0, -3)

  console[type](`${dateStr} [${moduleName}] ${message}`, ...extra)

  const whStr = [
    `[${moduleName}] <t:${dateStr}:d> <t:${dateStr}:T>`,
    `${type === "error" ? "⚠️ " : ""}${message.replaceAll("<@", "< @")}`,
    ...extra
      .map((item) => {
        if (typeof item === "string") return item
        if (typeof item === "number") return item.toString()
        if (item instanceof Error) return item.message
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
