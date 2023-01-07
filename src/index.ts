import { Client, MetadataStorage } from "discordx"
import { dirname, importx } from "@discordx/importer"
import { GatewayIntentBits, Partials } from "discord.js"

import { Config } from "./utils/Config.js"
import { initGlobalApplicationCommands } from "./utils/initGlobalApplicationCommands.js"
import { log } from "./utils/log.js"

async function start() {
  log("index", "Starting bot")

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

    log("index", "Initialising guild slash commands")
    await client.initGuildApplicationCommands(
      Config.discordGuildId,
      allSlash.slice(0, 100)
    )
    log("index", "Initialising global slash commands")
    await initGlobalApplicationCommands(client, allSlash.slice(100))
    log("index", "Commands initialised")
  })

  await importx(`${dirname(import.meta.url)}/commands/**/*.{js,ts}`)
  await importx(`${dirname(import.meta.url)}/previews/**/*.{js,ts}`)

  await client.login(Config.discordToken)
  log("index", "Bot logged in")
}

void start()

process.on("uncaughtException", (error, origin) => {
  log("crash", "Crashed", "error", error, origin)
  setTimeout(() => process.exit(1), 1000)
})
