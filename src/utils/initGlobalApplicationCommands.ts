/* eslint-disable sonarjs/cognitive-complexity */

/* From https://github.com/discordx-ts/discordx/blob/4e571963fd9469dfd6f0c6244f282fade20c4e09/packages/discordx/src/Client.ts#L750 */

/*

   Copyright 2021 Vijay Meena

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

*/

import {
  type Client,
  type InitCommandOptions,
  ApplicationCommandMixin,
  isApplicationCommandEqual,
  type ApplicationCommandDataEx,
  type DApplicationCommand
} from "discordx"

import { type ApplicationCommandData } from "discord.js"

export async function initGlobalApplicationCommands(
  client: Client,
  DCommands: DApplicationCommand[],
  options?: InitCommandOptions
): Promise<void> {
  if (!client.application) {
    throw Error(
      "The client is not yet ready, connect to discord before fetching commands"
    )
  }

  // # initialize add/update/delete task for global commands
  const ApplicationCommands = (
    await client.application.commands.fetch()
  )?.filter((cmd) => !cmd.guild)

  const commandsToAdd = DCommands.filter(
    (DCommand) =>
      !ApplicationCommands.find(
        (cmd) => cmd.name === DCommand.name && cmd.type === DCommand.type
      )
  )

  const commandsToUpdate: ApplicationCommandMixin[] = []
  const commandsToSkip: ApplicationCommandMixin[] = []

  DCommands.forEach((DCommand) => {
    const findCommand = ApplicationCommands.find(
      (cmd) => cmd.name === DCommand.name && cmd.type === DCommand.type
    )

    if (!findCommand) {
      return
    }

    if (!isApplicationCommandEqual(findCommand, DCommand)) {
      commandsToUpdate.push(new ApplicationCommandMixin(findCommand, DCommand))
    } else {
      commandsToSkip.push(new ApplicationCommandMixin(findCommand, DCommand))
    }
  })

  const commandsToDelete = ApplicationCommands.filter((cmd) =>
    DCommands.every(
      (DCommand) => DCommand.name !== cmd.name || DCommand.type !== cmd.type
    )
  )

  // If there are no changes to share with Discord, cancel the task
  if (
    commandsToAdd.length + commandsToUpdate.length + commandsToDelete.size ===
    0
  ) {
    return
  }

  // perform bulk update with discord using set operation
  const bulkUpdate: ApplicationCommandDataEx[] = []

  const operationToSkip = commandsToSkip.map((cmd) =>
    bulkUpdate.push(cmd.instance.toJSON())
  )

  const operationToAdd = options?.disable?.add
    ? []
    : commandsToAdd.map((DCommand) => bulkUpdate.push(DCommand.toJSON()))

  const operationToUpdate = options?.disable?.update
    ? commandsToUpdate.map((cmd) =>
        bulkUpdate.push(cmd.command.toJSON() as ApplicationCommandDataEx)
      )
    : commandsToUpdate.map((cmd) => bulkUpdate.push(cmd.instance.toJSON()))

  const operationToDelete = options?.disable?.delete
    ? commandsToDelete.map((cmd) =>
        bulkUpdate.push(cmd.toJSON() as ApplicationCommandDataEx)
      )
    : []

  await Promise.all([
    // skipped
    ...operationToSkip,

    // add
    ...operationToAdd,

    // update
    ...operationToUpdate,

    // delete
    ...operationToDelete
  ])

  await client.application?.commands.set(bulkUpdate as ApplicationCommandData[])
}
