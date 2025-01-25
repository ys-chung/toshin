import { z } from "zod"

import RawConfig from "../config.toml"

const Config = z
  .object({
    token: z.string(),
    emoji: z.string(),
    colour: z.number(),
    guildId: z.string(),
    webhookUrl: z.string().url(),
    threadId: z.string(),
    booru: z.record(z.string(), z.string()).optional(),
    emotes: z.object({
      simple: z.record(z.string().or(z.array(z.string()))),
      replacement: z.record(z.array(z.array(z.string()).min(1).max(3)))
    }),
    pixiv: z.object({
      refreshToken: z.string()
    })
  })
  .parse(RawConfig)

export { Config }
