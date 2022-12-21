import fs from "node:fs/promises"
import { z } from "zod"

export const Config = z
  .object({
    discordToken: z.string(),
    discordGuildId: z.string(),
    colour: z
      .string()
      .regex(/^[0-9A-F]{6}$/i)
      .transform((val) => Number("0x" + val.toLowerCase()))
      .pipe(z.number()),
    emoji: z.string().default("🤖")
  })
  .parse(
    JSON.parse(await fs.readFile("./config/config.json", { encoding: "utf-8" }))
  )
