import _ from "lodash"

export type Sticker = string[]

export type StickerPack = Record<string, Sticker>

export type StickerPackList = Record<string, StickerPack>

export function isSticker(candidate: unknown): candidate is Sticker {
    const predicate = candidate as Sticker

    if (!_.isArray(predicate)) {
        return false
    }

    if (!predicate.every((element) => _.isString(element))) {
        return false
    }

    return true
}

export function isStickerPack(candidate: unknown): candidate is StickerPack {
    const predicate = candidate as StickerPack

    for (const key in predicate) {
        if (!isSticker(predicate[key])) {
            return false
        }
    }

    return true
}

export function isStickerPackList(
    candidate: unknown
): candidate is StickerPackList {
    const predicate = candidate as StickerPackList

    for (const key in predicate) {
        if (!isStickerPack(predicate[key])) {
            return false
        }
    }

    return true
}
