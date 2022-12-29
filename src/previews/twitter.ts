import { Discord, On, type ArgsOf } from "discordx"
import { TwitterApi } from "twitter-api-v2"

import { Config } from "../utils/Config.js"
import { stringMatch, extractUrls } from "../utils/utils.js"

const TWEET_ID_REGEX = /^\/[a-zA-Z0-9_]+\/status\/([0-9]+)/

const TwitterClient = new TwitterApi(Config.previews.twitter.bearerToken)

@Discord()
export class TwitterPreview {
  @On({ event: "messageCreate" })
  async onMessage([message]: ArgsOf<"messageCreate">) {
    if (!stringMatch(message.content, "twitter", "nitter")) return

    const url = extractUrls(message.content).find(
      (url) =>
        stringMatch(
          url.host,
          "twitter.com",
          "mobile.twitter.com",
          "nitter.it"
        ) && url.pathname.match(TWEET_ID_REGEX)
    )
    const tweetId = url?.pathname?.match(TWEET_ID_REGEX)?.[1]
    if (!url || !tweetId) return

    const tweet = await TwitterClient.v2.singleTweet(tweetId, {
      "tweet.fields": ["attachments"],
      expansions: ["attachments.media_keys"],
      "media.fields": ["variants"]
    })

    if (!tweet.includes?.media) return

    const content = []

    if (tweet.includes.media.length > 1) {
      content.push(
        `📒 This tweet has ${tweet.includes.media.length} media attachments.`
      )
    }

    const videoMedia = tweet.includes.media.filter(
      (media) => media.type === "video"
    )

    const videoUrls = videoMedia
      .map((media) => {
        if (!media.variants) return

        const largestBitrate = Math.max(
          ...media.variants
            .map((variant) => variant.bit_rate)
            .filter((b): b is number => !!b)
        )

        const selectedVariant = media.variants.find(
          (variant) => variant.bit_rate === largestBitrate
        )
        if (!selectedVariant)
          throw new Error("Cannot find largest bitrate media variant")

        return selectedVariant.url
      })
      .filter((mediaUrl): mediaUrl is string => mediaUrl !== undefined)

    if (videoUrls.length > 0) {
      content.push(
        [
          "▶️ Twitter video" + (videoUrls.length === 1 ? "" : "s"),
          ...videoUrls
        ].join("\n")
      )
    }

    if (content.length === 0) return

    await message.reply({
      content: content.join("\n\n")
    })
  }
}
