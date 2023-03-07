import { Discord, On, type ArgsOf } from "discordx"
import { type TweetV2SingleResult, TwitterApi } from "twitter-api-v2"

import { Config } from "../utils/Config.js"
import { stringMatch, extractUrls, throwError } from "../utils/utils.js"

import { Log } from "../utils/log.js"

const TWEET_ID_REGEX = /^\/[a-zA-Z0-9_]+\/status\/([0-9]+)/

const log = new Log("twitter")
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
          "nitter.net",
          "nitter.it"
        ) && url.pathname.match(TWEET_ID_REGEX)
    )
    const tweetId = url?.pathname?.match(TWEET_ID_REGEX)?.[1]
    if (!url || !tweetId) return

    void log.info("Processing tweet", tweetId)

    let tweet: TweetV2SingleResult

    try {
      tweet = await TwitterClient.v2.singleTweet(tweetId, {
        "tweet.fields": ["attachments"],
        expansions: ["attachments.media_keys"],
        "media.fields": ["variants"]
      })
      void log.info("Fetched tweet metadata", tweetId)
    } catch (error) {
      void log.error("Failed to fetch tweet metadata", tweetId, error)
      return
    }

    if (!tweet.includes?.media) {
      void log.info("Tweet does not include any media", tweetId)
      return
    }

    const content = []

    if (tweet.includes.media.length > 1) {
      void log.info("Tweet includes >1 media", tweetId)

      content.push(
        `📒 This tweet has ${tweet.includes.media.length} media attachments.`
      )
    }

    const videoMedia = tweet.includes.media.filter(
      (media) => media.type === "video"
    )

    const videoUrls = videoMedia
      .map((media) => {
        if (!media.variants) {
          void log.error("Tweet video media does not have variants", tweetId)
          return
        }

        const largestBitrate = Math.max(
          ...media.variants
            .map((variant) => variant.bit_rate)
            .filter((b): b is NonNullable<typeof b> => !!b)
        )

        const selectedVariant = media.variants.find(
          (variant) => variant.bit_rate === largestBitrate
        )
        if (!selectedVariant) {
          throwError("Cannot find largest bitrate media variant")
        }

        return selectedVariant.url
      })
      .filter(
        (mediaUrl): mediaUrl is NonNullable<typeof mediaUrl> =>
          mediaUrl !== undefined
      )

    if (videoUrls.length > 0) {
      void log.info("Tweet includes videos", tweetId)

      content.push(
        [
          "▶️ Twitter video" + (videoUrls.length === 1 ? "" : "s"),
          ...videoUrls
        ].join("\n")
      )
    }

    if (content.length === 0) {
      void log.info("No results were generated", tweetId)
      return
    }

    void log.info("Response generated", tweetId)
    await message.reply({
      content: content.join("\n\n")
    })
  }
}
