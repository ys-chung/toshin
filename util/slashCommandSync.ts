import {
  type Client,
  type ApplicationCommand,
  type ApplicationCommandDataResolvable,
  ApplicationCommandOptionType
} from "discord.js"

import { cmdArr } from "../commands/import"
import { Config } from "./Config"

import type { DefineCmdOptions } from "./Cmd"

type CmdOptionsLite = Omit<DefineCmdOptions, "run">

function compare(cmd: CmdOptionsLite, slashCommand: ApplicationCommand) {
  // check if name or alias matches
  if (
    cmd.name !== slashCommand.name &&
    !cmd.aliases?.includes(slashCommand.name)
  )
    return false

  // check if description matches
  if (cmd.description !== slashCommand.description) return false

  // if it has params
  if (cmd.params) {
    // if there are no params
    if (slashCommand.options.length === 0) return false

    // check if all params are string type
    if (
      slashCommand.options.some(
        (o) => o.type !== ApplicationCommandOptionType.String
      )
    )
      return false

    // check if params length matches
    if (cmd.params.length !== slashCommand.options.length) return false

    // check if params are in correct order
    if (cmd.params.some((p, i) => p.name !== slashCommand.options[i].name))
      return false

    // if params required is the same
    if (
      cmd.params.some(
        (p, i) =>
          slashCommand.options[i].type !==
            ApplicationCommandOptionType.String ||
          p.required !== slashCommand.options[i].required
      )
    )
      return false

    // if param names or descriptions are the same
    if (
      cmd.params.some(
        (p, i) =>
          slashCommand.options[i].name !== p.name ||
          slashCommand.options[i].description !== p.description
      )
    )
      return false
  }

  return true
}

export async function slashCommandSync(client: Client) {
  console.log("syncing slash commands")

  const localCmdArr: CmdOptionsLite[] = cmdArr.map((cmd) => ({
    ...cmd,
    run: undefined
  }))

  // all cmd names and aliases
  const localCmdNamesArrFlat: string[] = localCmdArr.flatMap((e) => [
    e.name,
    ...(e.aliases ?? [])
  ])

  const cmdsToCreate: [string, CmdOptionsLite][] = []
  const cmdsToRemoveGuild: string[] = []
  const cmdsToRemoveGlobal: string[] = []

  // get all guild commands
  const guild = await client.guilds.fetch(Config.guildId)
  if (!guild) {
    throw new Error(`failed to fetch guild ${Config.guildId}`)
  }

  let guildCommands = await guild.commands.fetch()

  // get all global commands
  const globalCommands = await client.application?.commands.fetch()
  if (!globalCommands) {
    throw new Error(`failed to fetch global commands`)
  }

  for (const cmdNameOrAlias of localCmdNamesArrFlat) {
    const cmd = localCmdArr.find(
      (c) => c.name === cmdNameOrAlias || c.aliases?.includes(cmdNameOrAlias)
    )

    if (!cmd) {
      throw new Error(`cannot find cmd ${cmdNameOrAlias}`)
    }

    const guildFound = guildCommands.find(
      (c) => c.name === cmd.name || cmd.aliases?.includes(c.name)
    )
    const globalFound = globalCommands.find(
      (c) => c.name === cmd.name || cmd.aliases?.includes(c.name)
    )

    if (guildFound && globalFound) {
      cmdsToRemoveGlobal.push(guildFound.id)
      cmdsToRemoveGuild.push(globalFound.id)
      cmdsToCreate.push([cmdNameOrAlias, cmd])
      continue
    }

    if (guildFound) {
      const isSame = compare(cmd, guildFound)
      if (!isSame) {
        cmdsToRemoveGuild.push(guildFound.id)
        cmdsToCreate.push([cmdNameOrAlias, cmd])
        continue
      }
      continue
    }

    if (globalFound) {
      const isSame = compare(cmd, globalFound)
      if (!isSame) {
        cmdsToRemoveGlobal.push(globalFound.id)
        cmdsToCreate.push([cmdNameOrAlias, cmd])
        continue
      }
      continue
    }

    // if no guild or global command found, create
    cmdsToCreate.push([cmdNameOrAlias, cmd])
  }

  // find any guild or global commands that are not in localCmdArr
  guildCommands.forEach((guildCommand) => {
    if (!localCmdNamesArrFlat.includes(guildCommand.name)) {
      cmdsToRemoveGuild.push(guildCommand.id)
    }
  })

  globalCommands.forEach((globalCommand) => {
    if (!localCmdNamesArrFlat.includes(globalCommand.name)) {
      console.log(`removing global cmd ${globalCommand.name}`)
      cmdsToRemoveGlobal.push(globalCommand.id)
    }
  })

  console.table({
    guildCommands: guildCommands.size,
    globalCommands: globalCommands.size,
    cmdsToCreate: cmdsToCreate.length,
    cmdsToRemoveGuild: cmdsToRemoveGuild.length,
    cmdsToRemoveGlobal: cmdsToRemoveGlobal.length
  })

  if (cmdsToRemoveGuild.length > 0 || cmdsToRemoveGlobal.length > 0) {
    console.log(
      `removing ${cmdsToRemoveGuild.length} guild commands, ${cmdsToRemoveGlobal.length} global commands`
    )

    // remove guild commands
    for (const guildCommandId of cmdsToRemoveGuild) {
      console.log(`removing guild cmd ${guildCommandId}`)
      await guild.commands.delete(guildCommandId)
    }

    // remove global commands
    for (const globalCommandId of cmdsToRemoveGlobal) {
      console.log(`removing global cmd ${globalCommandId}`)
      await client.application?.commands.delete(globalCommandId)
    }
  }

  if (cmdsToCreate.length > 0) {
    console.log(`creating ${cmdsToCreate.length} commands`)

    if (cmdsToCreate.length > 200) {
      throw new Error(`too many commands to create at once`)
    }

    // check length of guild commands
    guildCommands = await guild.commands.fetch()
    const remainingGuildCommandsCapacity = 100 - guildCommands.size
    console.log(
      `remaining guild commands capacity: ${remainingGuildCommandsCapacity}`
    )

    // split cmdsToCreate into guild and global
    const cmdsToCreateGuild = cmdsToCreate.slice(
      0,
      remainingGuildCommandsCapacity
    )
    const cmdsToCreateGlobal = cmdsToCreate.slice(
      remainingGuildCommandsCapacity
    )

    console.log(
      `creating ${cmdsToCreateGuild.length} guild commands, ${cmdsToCreateGlobal.length} global commands`
    )

    // create guild commands
    for (const [cmdNameOrAlias, cmd] of cmdsToCreateGuild) {
      console.log(`creating guild cmd ${cmdNameOrAlias}`)

      const payload: ApplicationCommandDataResolvable = {
        name: cmdNameOrAlias,
        description: cmd.description
      }

      if (cmd.params) {
        payload.options = cmd.params.map((p) => ({
          name: p.name,
          description: p.description,
          type: ApplicationCommandOptionType.String,
          required: p.required
        }))
      }

      await guild.commands.create(payload)
    }

    // create global commands
    for (const [cmdNameOrAlias, cmd] of cmdsToCreateGlobal) {
      console.log(`creating global cmd ${cmdNameOrAlias}`)

      const payload: ApplicationCommandDataResolvable = {
        name: cmdNameOrAlias,
        description: cmd.description
      }

      if (cmd.params) {
        payload.options = cmd.params.map((p) => ({
          name: p.name,
          description: p.description,
          type: ApplicationCommandOptionType.String,
          required: p.required
        }))
      }

      await client.application?.commands.create(payload)
    }
  }

  console.log(`done syncing slash commands`)
}
