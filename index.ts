import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type BaseMessageOptions
} from "discord.js"

import { parseArgsStringToArgv } from "string-argv"
import { once } from "es-toolkit"

import { makeLog } from "./util/log"
const log = makeLog(import.meta.file)

import { cmdArr } from "./commands/import"
import { pixiv } from "./previews/pixiv/preview"
import { Config } from "./util/Config"
import { ToshinEmbedBuilder } from "./util/ToshinEmbedBuilder"
import { slashCommandSync } from "./util/slashCommandSync"

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: {
    repliedUser: false
  }
})

client.on(Events.ClientReady, (readyClient) => {
  log(`Logged in as ${readyClient.user.tag}!`)
  slashCommandSync(readyClient)
})

// Old fashioned plain text cmd
client.on(Events.MessageCreate, (message) => {
  if (message.guildId !== Config.guildId) return

  pixiv(message)

  if (!message.content.startsWith("!")) return

  const cmdName = message.content.substring(1).match(/\S+/)?.[0]
  if (!cmdName) {
    log("no command name found")
    return
  }

  const cmdRest = message.content.slice(1 + cmdName.length + 1)

  const cmd = cmdArr.find(
    (c) => c.name === cmdName || c.aliases?.includes(cmdName)
  )

  if (!cmd) {
    log(`cannot find command ${cmdName}`)
    return
  }

  const interaction = {
    name: cmd.name,
    user: message.member ?? message.author,
    channel: message.channel,
    reply: once((msg: BaseMessageOptions) => message.reply(msg))
  }

  if (cmd.flatParams) {
    if (cmdRest === "" && cmd.params.some((p) => p.required)) {
      message.reply({
        embeds: [
          new ToshinEmbedBuilder({
            description: `${cmd.name} requires more params than you provided. please check the command usage again.`
          })
        ]
      })
      return
    }

    // When cmd has flat params
    cmd.run({
      ...interaction,
      paramString: cmdRest
    })
  } else if (cmd.params) {
    // When cmd has non-flat params
    const paramsParsed = parseArgsStringToArgv(cmdRest)

    if (paramsParsed.length > cmd.params.length) {
      console.info(`Cmd ${cmd.name} parsed params length longer than defined`)
    }

    const requiredParams = cmd.params.filter((e) => e.required)
    // If required params are not provided
    if (requiredParams.length > paramsParsed.length) {
      message.reply({
        embeds: [
          new ToshinEmbedBuilder({
            description: `${cmd.name} requires more params than you provided. please check the command usage again.`
          })
        ]
      })
      return
    }

    const params = cmd.params.map((e, i) => ({ ...e, value: paramsParsed[i] }))

    cmd.run({
      ...interaction,
      params
    })
  } else {
    // When cmd has no params
    cmd.run(interaction)
  }
})

client.on(Events.InteractionCreate, (interaction) => {
  if (
    !interaction.isCommand() ||
    !interaction.channel ||
    interaction.channel.type !== ChannelType.GuildText ||
    interaction.guildId !== Config.guildId
  )
    return

  const cmdName = interaction.commandName
  const cmd = cmdArr.find(
    (c) => c.name === cmdName || c.aliases?.includes(cmdName)
  )

  if (!cmd) {
    log(`cannot find command ${cmdName}`)
    return
  }

  const cmdInteraction = {
    name: cmd.name,
    user: interaction.user,
    channel: interaction.channel,
    reply: once((msg: BaseMessageOptions) => interaction.reply(msg))
  }

  if (cmd.params) {
    const params = cmd.params
      .map((p) => ({
        ...p,
        value: interaction.options.get(p.name)?.value?.toString()
      }))
      .filter((p) => p.value)

    if (cmd.flatParams) {
      cmd.run({
        ...cmdInteraction,
        paramString: params.map((p) => p.value).join(cmd.splitChar ?? "")
      })
    } else {
      cmd.run({
        ...cmdInteraction,
        params
      })
    }
  } else {
    cmd.run(cmdInteraction)
  }
})

client.login(Config.token)
