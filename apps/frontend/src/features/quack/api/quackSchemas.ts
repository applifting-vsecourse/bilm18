import { z } from "zod"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

// Mirrors the backend's QUACK_MOODS / Prisma `QuackMood` enum.
export const quackMoods = ["happy", "sad", "angry", "silly"] as const

export const quackMoodSchema = z.enum(quackMoods)

export const quackPollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().int().nonnegative(),
})

// Totals only — the server never sends who voted for what, just the
// signed-in user's own vote.
export const quackPollSchema = z.object({
  options: z.array(quackPollOptionSchema),
  totalVotes: z.number().int().nonnegative(),
  myVoteOptionId: z.string().nullable(),
})

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  // null for quacks posted without a mood.
  mood: quackMoodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  // null for quacks without a poll.
  poll: quackPollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
export type QuackMood = z.infer<typeof quackMoodSchema>
export type QuackPoll = z.infer<typeof quackPollSchema>
export type QuackPollOption = z.infer<typeof quackPollOptionSchema>
