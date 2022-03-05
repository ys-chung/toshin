import _ from "lodash"

interface TweetResponse {
    data: {
        id: string
        text: string
        attachments?: {
            media_keys: string[]
        }
        possibly_sensitive?: boolean
    }
    includes?: {
        media?: {
            media_key: string
            type: "animated_gif" | "photo" | "video"
        }[]
    }
}
export function isThisATweetResponse(
    candidate: unknown
): candidate is TweetResponse {
    const predicate = candidate as TweetResponse

    return _.isString(predicate.data.id) && _.isString(predicate.data.text)
}
