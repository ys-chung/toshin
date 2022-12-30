import { EmbedBuilder } from "@discordjs/builders"
import { type AutocompleteInteraction } from "discord.js"
import { z } from "zod"

import Booru from "booru"
import { Eiyuu } from "eiyuu"

import { Config } from "../utils/Config.js"

import {
  ToshinCommand,
  type BaseToshinCommand
} from "../utils/ToshinCommand.js"

const Sb = Booru.forSite("sb")
const eiyuu = new Eiyuu()

function sbAutocomplete(q: string) {
  return eiyuu.safebooru(q)
}

async function searchBooruAndEmbed(paramString: string) {
  const result = await Sb.search(paramString, {
    limit: 1,
    random: true
  })

  if (result.length === 0) {
    return new EmbedBuilder().setDescription("No images found")
  }

  const post = result[0]
  const imageUrl = post.sampleUrl ?? post.fileUrl ?? post.previewUrl

  if (imageUrl === null) {
    return new EmbedBuilder().setDescription("No images found")
  }

  return new EmbedBuilder()
    .setImage(imageUrl)
    .setURL(post.postView)
    .setTitle("Post")
}

async function autocompleteBooruQuery(
  interaction: AutocompleteInteraction,
  maxTags = 12
) {
  const tags = z.string().safeParse(interaction.options.get("tags")?.value)
  if (!tags.success) return

  const tagsArr = tags.data.split(" ")

  if (tagsArr.length > maxTags) {
    const response = tagsArr.slice(0, maxTags).join(" ")
    void interaction.respond([{ name: response, value: response }])
    return
  }

  if (tagsArr.length > 0) {
    const lastTag = tagsArr[tagsArr.length - 1]
    const prevTags = tagsArr.slice(0, tagsArr.length - 1).join(" ")

    const tags = (await sbAutocomplete(lastTag)).slice(0, 25)

    try {
      void interaction.respond(
        tags.map((val) => {
          const thisOpt = [prevTags, val].join(" ")
          return {
            name: thisOpt,
            value: thisOpt
          }
        })
      )
    } catch (e) {
      console.error(e)
    }
  }
}

for (const commandName of ["sb", "db"] as const) {
  ToshinCommand({
    name: commandName,
    description: "search booru for an image",
    parameter: {
      name: "tags",
      description: "tags to search for",
      required: true,
      autocomplete: true
    }
  })(
    class implements BaseToshinCommand {
      async answer(paramString: string) {
        return await searchBooruAndEmbed(paramString)
      }

      async autocomplete(interaction: AutocompleteInteraction) {
        await autocompleteBooruQuery(interaction)
      }
    }
  )
}

for (const [alias, tag] of Object.entries(Config.commands.booru)) {
  ToshinCommand({
    name: alias.toLowerCase() as Lowercase<string>,
    description: `find a ${alias}`,
    parameter: {
      name: "tags",
      description: "extra tags to search for",
      required: false,
      autocomplete: true
    }
  })(
    class implements BaseToshinCommand {
      async answer(paramString: string) {
        return await searchBooruAndEmbed([tag, paramString].join(" "))
      }

      async autocomplete(interaction: AutocompleteInteraction) {
        await autocompleteBooruQuery(interaction, 11)
      }
    }
  )
}
