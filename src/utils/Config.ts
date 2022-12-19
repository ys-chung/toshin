import fs from "node:fs/promises"
import { z } from "zod"

export const Config = z
  .object({
    discordToken: z.string(),
    discordGuildId: z.string()
  })
  .parse(
    JSON.parse(await fs.readFile("./config/config.json", { encoding: "utf-8" }))
  )
