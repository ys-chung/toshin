import { type GuardFunction, SimpleCommandMessage } from "discordx"

import type { CommandInteraction } from "discord.js"

import { Config } from "./Config.js"

export const inApprovedGuild: GuardFunction<
  SimpleCommandMessage | CommandInteraction
> = async (arg, _client, next) => {
  const guildId =
    arg instanceof SimpleCommandMessage ? arg.message.guildId : arg.guildId
  if (guildId === Config.discordGuildId) await next()
}
