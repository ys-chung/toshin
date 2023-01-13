import {
  Discord,
  SimpleCommand,
  type SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
  Guard
} from "discordx"

import {
  ApplicationCommandOptionType,
  type CommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  cleanContent
} from "discord.js"

import { baseEmbedJson } from "../utils/ToshinCommand.js"
import { Config, Emotes } from "../utils/Config.js"
import { sample, isURL, throwError } from "../utils/utils.js"
import { inApprovedGuild } from "../utils/guard.js"
import { Log } from "../utils/log.js"

import { type SimpleEmote, type ReplacementEmote } from "../types/Emote.js"

const log = new Log("emote")

function simpleEmoteCommand(emoteName: string, emote: SimpleEmote) {
  const commandOptions = {
    name: emoteName.toLowerCase() as Lowercase<string>,
    description: emoteName
  }

  @Discord()
  class _SimpleEmoteCommand {
    generateOptions() {
      void log.info("Processing emote", emoteName)

      const selectedReply = Array.isArray(emote.content)
        ? sample(emote.content)
        : emote.content

      if (isURL(selectedReply)) {
        void log.info("Reply is an image, adding to embed as image")
        if (selectedReply.match(/\.(?:gif|jpg|png)$/))
          return {
            embeds: [new EmbedBuilder(baseEmbedJson).setImage(selectedReply)]
          }

        return { content: selectedReply }
      }

      void log.info("Reply is not an image, adding to embed as text")
      return {
        embeds: [new EmbedBuilder(baseEmbedJson).setDescription(selectedReply)]
      }
    }

    @SimpleCommand(commandOptions)
    replyCommand(command: SimpleCommandMessage) {
      return command.message.reply(this.generateOptions())
    }

    @Slash(commandOptions)
    @Guard(inApprovedGuild)
    replyInteraction(i: CommandInteraction) {
      return i.reply(this.generateOptions())
    }
  }
}

function replacementEmoteCommand(
  emoteName: string,
  replacementEmote: ReplacementEmote
) {
  const commandOptions = {
    name: emoteName.toLowerCase() as Lowercase<string>,
    description: emoteName + " a friend"
  }

  const commandOptionOptions = {
    name: "friend" as const,
    description: "cool friend to " + emoteName,
    required: true
  }

  @Discord()
  class _ReplacementEmoteCommand {
    generateOptions(friend: string, sender: string) {
      void log.info("Processing emote", emoteName)

      if (
        replacementEmote.verifyParams &&
        friend.replaceAll("\u200B", "") !== Config.commands.emotes.allowedParams
      ) {
        void log.info(
          "Emote requires verifyParams, but params does not match",
          emoteName
        )

        return
      }

      const selectedContent = sample(replacementEmote.content)

      let replyText: string

      if (selectedContent.length === 2) {
        replyText = [selectedContent[0], friend, selectedContent[1]].join("")
      } else if (selectedContent.length === 3) {
        replyText = [
          selectedContent[0],
          friend,
          selectedContent[1],
          sender,
          selectedContent[2]
        ].join("")
      } else if (selectedContent.length === 1) {
        replyText = selectedContent[0]
      } else {
        throwError(
          `Array of element in content of replacement emote "${emoteName}" is neither 1, 2 or 3 elements long.`
        )
      }

      void log.info("Emote response generated")

      return {
        embeds: [
          new EmbedBuilder(baseEmbedJson).setDescription(
            `_${Config.emoji}\n\n${replyText}_`
          )
        ]
      }
    }

    @SimpleCommand(commandOptions)
    replyCommand(
      @SimpleCommandOption({
        ...commandOptionOptions,
        type: SimpleCommandOptionType.String
      })
      friend: string,
      command: SimpleCommandMessage
    ) {
      if (!command.isValid()) {
        void log.info("Simple command invalid, replying usage syntax")

        return command.sendUsageSyntax()
      }

      const messageOptions = this.generateOptions(
        cleanContent(friend, command.message.channel),
        escapeMarkdown(
          command.message.member?.nickname ?? command.message.author.username
        )
      )

      if (!messageOptions) {
        void log.info("Emote did not generate anything")

        return
      }

      return command.message.reply(messageOptions)
    }

    @Slash(commandOptions)
    @Guard(inApprovedGuild)
    replyInteraction(
      @SlashOption({
        ...commandOptionOptions,
        type: ApplicationCommandOptionType.String
      })
      friend: string,
      i: CommandInteraction
    ) {
      if (!i.channel) {
        void log.info("Interaction does not have a channel")

        return
      }

      const messageOptions = this.generateOptions(
        cleanContent(friend, i.channel),
        escapeMarkdown(
          i.guild?.members.resolve(i.user.id)?.nickname ?? i.user.username
        )
      )

      if (!messageOptions) {
        void log.info("Emote did not generate anything")

        return
      }

      return i.reply(messageOptions)
    }
  }
}

for (const [emoteName, emote] of Object.entries(Emotes)) {
  switch (emote.type) {
    case "simple": {
      simpleEmoteCommand(emoteName, emote)
      break
    }

    case "replacement": {
      replacementEmoteCommand(emoteName, emote)
      break
    }
  }
}
