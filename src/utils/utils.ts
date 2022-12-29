import { type Message, ChannelType } from "discord.js"

export function extractUrls(input: string): URL[] {
  const inputArr = input
    .split(/[ \n]/g)
    .map((str) => str.replace(/^</, "").replace(/>$/, ""))
  return inputArr
    .map((e) => {
      try {
        return new URL(e)
      } catch (_error) {
        return false
      }
    })
    .filter((e): e is URL => e !== false)
}

export function isMessageChannelUnsafe(message: Message): boolean {
  switch (message.channel.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return message.channel.nsfw

    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return message.channel.parent?.nsfw ?? false

    default:
      return false
  }
}

export function stringMatch(candidate: string, ...regexp: (string | RegExp)[]) {
  for (const r of regexp) {
    if (candidate.match(r)) return true
  }

  return false
}

export function throwError(error: string): never {
  throw new Error(error)
}
