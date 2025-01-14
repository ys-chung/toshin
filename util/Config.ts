import { z } from "zod"

import RawConfig from "../config.toml"

const Config = z
  .object({
    token: z.string(),
    emoji: z.string(),
    emotes: z.object({
      simple: z.record(z.string().or(z.array(z.string()))),
      replacement: z.record(z.array(z.array(z.string()).min(1).max(3)))
    })
  })
  .parse(RawConfig)

export { Config }
