import { z } from "zod"

const StickerSchema = z.array(z.string()).nonempty()

export type Sticker = z.infer<typeof StickerSchema>

export const StickerPackSchema = z.record(StickerSchema)

export type StickerPack = z.infer<typeof StickerPackSchema>