import fs from "node:fs/promises"
import { z } from "zod"

import { StickerPackSchema } from "../types/Sticker.js"
import { EmoteListSchema } from "../types/Emote.js"

async function getConfigString(envName: Uppercase<string>, fileName: string) {
  const envValue = process.env[envName]
  return envValue
    ? Buffer.from(envValue, "base64").toString()
    : await fs.readFile(`./config/${fileName}`, { encoding: "utf-8" })
}

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
      booru: z.record(z.string()),
      emotes: z.object({
        allowedParams: z.string()
      })
    }),
    previews: z.object({
      pixiv: z.object({
        refreshToken: z.string()
      }),
      twitter: z.object({
        bearerToken: z.string()
      })
    }),
    debug: z.object({
      webhookUrl: z.string(),
      threadId: z.string()
    })
  })
  .parse(JSON.parse(await getConfigString("CONFIG_MAIN", "config.json")))

export const Mh = StickerPackSchema.parse(
  JSON.parse(await getConfigString("CONFIG_MH", "mh.json"))
)

export const Emotes = EmoteListSchema.parse(
  JSON.parse(await getConfigString("CONFIG_EMOTES", "emotes.json"))
)
