import _ from "lodash"

type Tag = {
    label: string
    value: string
}

export type BooruTags = Tag[]

export function isBooruTags(candidate: unknown): candidate is BooruTags {
    const predicate = candidate as BooruTags

    return (
        _.isArray(predicate) &&
        predicate.every(e => _.isString(e.value))
    )
}