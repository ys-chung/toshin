import { z } from "zod"

import RawConfig from "../config.toml"

const Config = z
  .object({
    token: z.string()
  })
  .parse(RawConfig)

export { Config }
