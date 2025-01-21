import { forSite } from "booru"

import { defineCmd } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"

const Sb = forSite("sb")

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
    run: async (interaction) => {
      console.log(booruName)

      if (interaction.paramString.length === 0) {
        console.log("no tags provided")
        interaction.reply({
          embeds: [new ToshinEmbedBuilder().setDescription("no tags provided")]
        })
        return
      }

      const result = await Sb.search(interaction.paramString, {
        limit: 1,
        random: true
      })

      console.log("got result")

      if (result.length === 0) {
        console.log("no images found")
        interaction.reply({
          embeds: [new ToshinEmbedBuilder().setDescription("no images found")]
        })
        return
      }

      const post = result[0]
      const imageUrl = post.sampleUrl ?? post.fileUrl ?? post.previewUrl

      if (imageUrl === null) {
        console.log("no image url found")
        interaction.reply({
          embeds: [new ToshinEmbedBuilder().setDescription("no images found")]
        })
        return
      }

      console.log("got image url")

      interaction.reply({
        embeds: [
          new ToshinEmbedBuilder()
            .setImage(imageUrl)
            .setURL(post.postView)
            .setTitle("post")
        ]
      })
    }
  })
}
