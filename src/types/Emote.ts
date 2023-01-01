import { z } from "zod"

export const EmoteTypeSchema = z.enum(["simple", "replacement"])

const SimpleEmoteSchema = z.object({
  type: z.literal("simple"),
  content: z.union([z.string(), z.array(z.string())])
})

export type SimpleEmote = z.infer<typeof SimpleEmoteSchema>

const ReplacementEmoteSchema = z.object({
  type: z.literal("replacement"),
  content: z.array(z.array(z.string())),
  verifyParams: z.boolean().optional()
})

export type ReplacementEmote = z.infer<typeof ReplacementEmoteSchema>

const EmoteSchema = SimpleEmoteSchema.or(ReplacementEmoteSchema)

export const EmoteListSchema = z.record(EmoteSchema)
