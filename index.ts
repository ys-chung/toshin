import {
  Client,
  Events,
  GatewayIntentBits,
  type BaseMessageOptions
} from "discord.js"

import { parseArgsStringToArgv } from "string-argv"
import { once } from "es-toolkit"

import { cmdArr } from "./commands/import"
import { Config } from "./util/Config"
import { ToshinEmbedBuilder } from "./util/ToshinEmbedBuilder"

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: {
    repliedUser: false
  }
})

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`)
})

// Old fashioned plain text cmd
client.on(Events.MessageCreate, (message) => {
  if (!message.content.startsWith("!")) return

  const cmdName = message.content.substring(1).match(/\S+/)?.[0]
  if (!cmdName) {
    console.log("no command name found")
    return
  }

  const cmdRest = message.content.slice(1 + cmdName.length + 1)

  const cmd = cmdArr.find(
    (c) => c.name === cmdName || c.aliases?.includes(cmdName)
  )

  if (!cmd) {
    console.log(`cannot find command ${cmdName}`)
    return
  }

  const interaction = {
    name: cmd.name,
    user: message.member ?? message.author,
    channel: message.channel,
    reply: once((msg: BaseMessageOptions) => message.reply(msg))
  }

  if (cmd.flatParams) {
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
            title: "Missing required params",
            description: `${cmd.name} requires more params than you provided. Please check the command usage again.`
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

client.login(Config.token)
