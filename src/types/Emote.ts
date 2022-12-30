import { z } from "zod"

export const EmoteTypeSchema = z.enum(["simple", "replacement"])

const SimpleEmoteSchema = z.object({
  type: z.literal("simple"),
  content: z.union([z.string(), z.array(z.string())])
})

const ReplacementEmoteSchema = z.object({
  type: z.literal("replacement"),
  content: z.array(z.array(z.string())),
  verifyParams: z.boolean().optional()
})

const EmoteSchema = SimpleEmoteSchema.or(ReplacementEmoteSchema)

export type Emote = z.infer<typeof EmoteSchema>

export const EmoteListSchema = z.record(EmoteSchema)
