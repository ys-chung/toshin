import { Glob } from "bun"

const glob = new Glob("*/cmd.ts")

for await (const file of glob.scan("./commands/")) {
  console.log(file)
  await import(`${import.meta.dir}/${file}`)
}

export { cmdArr } from "../util/Cmd"
