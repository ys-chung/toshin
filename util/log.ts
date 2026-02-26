import { Config } from "./Config"

export function makeLog(moduleName: string) {
  return async (message: string, ...extra: unknown[]) => {
    const time = Math.floor(Date.now() / 1000)

    console.log(`${time} [${moduleName}] ${message}`, ...extra)

    const whStr = [
      `[${moduleName}] <t:${time}:d> <t:${time}:T>`,
      `${message.replaceAll("<@", "< @")}`,
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

    void fetch(Config.webhookUrl + "?thread_id=" + Config.threadId, {
      method: "POST",
      body: JSON.stringify({
        content: whStr
      }),
      headers: {
        "Content-Type": "application/json"
      }
    }).catch((error) => {
      console.error(error)
    })
  }
}
