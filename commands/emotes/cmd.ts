import { sample, isString } from "es-toolkit"
import type { BaseMessageOptions } from "discord.js"
import { cleanContent, escapeMarkdown } from "discord.js"

import { defineCmd } from "../../util/Cmd"
import { ToshinEmbedBuilder } from "../../util/ToshinEmbedBuilder"
import { Config } from "../../util/Config"

const { simple, replacement } = Config.emotes

for (const [emoteName, value] of Object.entries(simple)) {
  const getContent = isString(value) ? () => value : () => sample(value)

  defineCmd({
    name: emoteName.toLowerCase(),
    description: emoteName,
    run: (interaction) => {
      const content = getContent()
      const replyOptions: BaseMessageOptions = {}

      if (content.match(/(mp4)$/)) {
        replyOptions.content = content
      } else {
        const embed = new ToshinEmbedBuilder()
        if (content.match(/(png|jpeg|jpg|gif)$/)) {
          embed.setImage(content)
        } else {
          embed.setDescription(content)
        }
        replyOptions.embeds = [embed]
      }

      interaction.reply(replyOptions)
    }
  })
}

for (const [emoteName, value] of Object.entries(replacement)) {
  defineCmd({
    name: emoteName.toLowerCase(),
    description: emoteName + "a friend",
    params: [
      {
        name: "friend",
        description: "cool friend to " + emoteName,
        required: true
      }
    ],
    flatParams: true,
    run: (interaction) => {
      const friend = cleanContent(interaction.paramString, interaction.channel)
      const sender = escapeMarkdown(
        "guild" in interaction.user
          ? interaction.user.nickname ?? interaction.user.user.displayName
          : interaction.user.displayName
      )

      const selected = sample(value)
      const contentArr =
        selected.length === 2
          ? [selected[0], friend, selected[1]]
          : selected.length === 3
          ? [selected[0], friend, selected[1], sender, selected[2]]
          : selected.length === 1
          ? selected
          : []

      if (contentArr.length === 0)
        throw new Error(
          `Array of element in content of replacement emote "${emoteName}" is neither 1, 2 or 3 elements long.`
        )

      const content = contentArr.join("")

      interaction.reply({
        embeds: [
          new ToshinEmbedBuilder().setDescription(
            `_${Config.emoji}\n\n${content}_`
          )
        ]
      })
    }
  })
}
