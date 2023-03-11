import { Client, MetadataStorage } from "discordx"
import { dirname, importx } from "@discordx/importer"
import { GatewayIntentBits, Partials } from "discord.js"

import { Config } from "./utils/Config.js"
import { initGlobalApplicationCommands } from "./utils/initGlobalApplicationCommands.js"
import { Log } from "./utils/log.js"

const log = new Log("index")

async function start() {
  log.info("Starting bot")

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

    log.info("Initialising guild slash commands")
    await client.initGuildApplicationCommands(
      Config.discordGuildId,
      allSlash.slice(0, 100)
    )
    log.info("Initialising global slash commands")
    await initGlobalApplicationCommands(client, allSlash.slice(100))
    log.info("Commands initialised")
  })

  await importx(`${dirname(import.meta.url)}/commands/**/*.{js,ts}`)
  await importx(`${dirname(import.meta.url)}/previews/**/*.{js,ts}`)

  await client.login(Config.discordToken)
  log.info("Bot logged in")
}

void start()

process.on("uncaughtException", (error, origin) => {
  try {
    log.error("Crashed", error, origin)
  } catch (_e) {
    process.exit(1)
  }
  setTimeout(() => process.exit(1), 1000)
})
