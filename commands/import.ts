import { Glob } from "bun"

import { makeLog } from "../util/log"
const log = makeLog(import.meta.file)

const glob = new Glob("*/cmd.ts")

for await (const file of glob.scan("./commands/")) {
  log("imported", file)
  await import(`${import.meta.dir}/${file}`)
}

export { cmdArr } from "../util/Cmd"
