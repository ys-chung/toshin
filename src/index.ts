import { Client } from "discordx"
import { dirname, importx } from "@discordx/importer"
import { GatewayIntentBits, Partials } from "discord.js"

import { Config } from "./utils/Config.js"

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
    await client.initApplicationCommands()

    console.log("Bot started")
  })

  await importx(`${dirname(import.meta.url)}/commands/**/*.{js,ts}`)
  await importx(`${dirname(import.meta.url)}/previews/**/*.{js,ts}`)

  await client.login(Config.discordToken)
}

void start()
