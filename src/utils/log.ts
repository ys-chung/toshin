import { Config } from "./Config.js"

const {
  debug: { webhookUrl, threadId }
} = Config

export function log(
  moduleName: string,
  message: string,
  type: "log" | "error" = "log"
) {
  const date = Date.now().toString().slice(0, -3)
  const logStr = `[${moduleName}] <t:${date}:d> <t:${date}:T>\n${
    type === "error" ? "⚠️ " : ""
  }${message.replaceAll("<@", "< @")}`

  console[type](logStr)

  try {
    void fetch(webhookUrl + "?thread_id=" + threadId, {
      method: "POST",
      body: JSON.stringify({
        content: logStr
      }),
      headers: {
        "Content-Type": "application/json"
      }
    })
  } catch (error) {
    console.error(error)
  }
}
