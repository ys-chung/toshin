import fs from "node:fs/promises"
import { z } from "zod"

import { StickerPackSchema } from "../types/Sticker.js"

export const Config = z
  .object({
    discordToken: z.string(),
    discordGuildId: z.string(),
    colour: z
      .string()
      .regex(/^[0-9A-F]{6}$/i)
      .transform((val) => Number("0x" + val.toLowerCase()))
      .pipe(z.number()),
    emoji: z.string().default("🤖"),
    commands: z.object({
      booru: z.record(z.string())
    }),
    previews: z.object({
      pixiv: z.object({
        refreshToken: z.string()
      })
    })
  })
  .parse(
    JSON.parse(await fs.readFile("./config/config.json", { encoding: "utf-8" }))
  )

export const Mh = StickerPackSchema.parse(
  JSON.parse(await fs.readFile("./config/mh.json", { encoding: "utf-8" }))
)
