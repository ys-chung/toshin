import { Client, MetadataStorage } from "discordx"
import { dirname, importx } from "@discordx/importer"
import { GatewayIntentBits, Partials } from "discord.js"

import { Config } from "./utils/Config.js"
import { initGlobalApplicationCommands } from "./utils/initGlobalApplicationCommands.js"
import { log } from "./utils/log.js"

async function start() {
  const client = new Client({
    simpleCommand: {
      prefix: "!"
    },
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message],
    botGuilds: [Config.discordGuildId],
    allowedMentions: {
      repliedUser: false
    }
  })

  client.on("messageCreate", async (message) => {
    await client.executeCommand(message)
  })

  client.on("interactionCreate", (interaction) => {
    client.executeInteraction(interaction)
  })

  client.once("ready", async () => {
    const allSlash = MetadataStorage.instance.applicationCommandSlashes
    await client.initGuildApplicationCommands(Config.discordGuildId, allSlash.slice(0, 100))
    await initGlobalApplicationCommands(client, allSlash.slice(100))

    log("index", "Bot started")
  })

  await importx(`${dirname(import.meta.url)}/commands/**/*.{js,ts}`)
  await importx(`${dirname(import.meta.url)}/previews/**/*.{js,ts}`)

  await client.login(Config.discordToken)
}

void start()
