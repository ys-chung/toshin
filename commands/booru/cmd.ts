import { forSite } from "booru"

import { defineCmd, type FlatParamsCmdInteraction } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"
import { Config } from "../../util/Config"

import { makeLog } from "../../util/log"
const log = makeLog(import.meta.file)

const Sb = forSite("sb")

async function runBooru(
  interaction: FlatParamsCmdInteraction,
  fixedTags?: string
) {
  if (interaction.paramString.length === 0 && !fixedTags) {
    log("no tags provided")
    interaction.reply({
      embeds: [new ToshinEmbedBuilder().setDescription("no tags provided")]
    })
    return
  }

  const searchString =
    interaction.paramString + (fixedTags ? ` ${fixedTags}` : "")

  const result = await Sb.search(searchString, {
    limit: 1,
    random: true
  })

  log("got result")

  if (result.length === 0) {
    log("no images found")
    interaction.reply({
      embeds: [new ToshinEmbedBuilder().setDescription("no images found")]
    })
    return
  }

  const post = result[0]
  const imageUrl = post.sampleUrl ?? post.fileUrl ?? post.previewUrl

  if (imageUrl === null) {
    log("no image url found")
    interaction.reply({
      embeds: [new ToshinEmbedBuilder().setDescription("no images found")]
    })
    return
  }

  log("got image url")

  interaction.reply({
    embeds: [
      new ToshinEmbedBuilder()
        .setImage(imageUrl)
        .setURL(post.postView)
        .setTitle("post")
    ]
  })
}

for (const booruName of ["sb", "db"] as const) {
  defineCmd({
    name: booruName,
    description: "search booru for an image",
    params: [
      {
        name: "tags",
        description: "tags to search for",
        required: true
      }
    ],
    flatParams: true,
    run: runBooru
  })
}

if (Config.booru) {
  for (const [alias, tag] of Object.entries(Config.booru)) {
    defineCmd({
      name: alias.toLowerCase(),
      description: `find a ${alias}`,
      params: [
        {
          name: "tags",
          description: "extra tags to search for",
          required: false
        }
      ],
      flatParams: true,
      run: async (interaction) => runBooru(interaction, tag)
    })
  }
}
