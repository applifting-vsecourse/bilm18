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

// Who a reply answers. `username` is null when that quack was deleted.
export const quackParentSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
})

// A live quack, or a tombstone: a quack deleted while it had replies
// (docs/adr/0001). A tombstone has `deletedAt` set and no text, author, mood
// or poll — it only keeps its place in the thread. Use `isTombstone`.
export const quackSchema = z.object({
  id: z.string(),
  // null only on a tombstone.
  text: z.string().nullable(),
  // null for quacks posted without a mood.
  mood: quackMoodSchema.nullable(),
  // null only on a tombstone.
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  // Both null for a top-level quack.
  parentId: z.string().nullable(),
  rootId: z.string().nullable(),
  // null only on a tombstone.
  user: quackUserSchema.nullable(),
  // null for quacks without a poll.
  poll: quackPollSchema.nullable(),
  // Live replies anywhere in the thread this quack starts; 0 for a reply.
  replyCount: z.number().int().nonnegative(),
  // null for a top-level quack.
  parent: quackParentSchema.nullable(),
})

// A quack's likes as the signed-in user sees them (docs/adr/0002). Sent with
// every quack in a list or thread, and on its own after a like or unlike.
export const quackLikesSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
})

// Lists and threads always carry the likes; `Quack` alone doesn't require
// them, so a quack shown without likes (the landing page) still fits.
export const quackWithLikesSchema = quackSchema.extend(quackLikesSchema.shape)

export const quacksSchema = z.array(quackWithLikesSchema)

// Which quacks a list shows: the feed (top-level quacks only), or everything
// the signed-in user wrote, replies included.
export type QuackScope = "all" | "mine"

export type Quack = z.infer<typeof quackSchema> & {
  // Present on everything loaded from a list or thread (quacksSchema).
  likeCount?: number
  likedByMe?: boolean
}
export type QuackWithLikes = z.infer<typeof quackWithLikesSchema>
export type QuackParent = z.infer<typeof quackParentSchema>
export type QuackMood = z.infer<typeof quackMoodSchema>
export type QuackPoll = z.infer<typeof quackPollSchema>
export type QuackPollOption = z.infer<typeof quackPollOptionSchema>
