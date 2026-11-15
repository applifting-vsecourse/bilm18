import type { Quack } from "@/features/quack/api/quackSchemas"

// What a list or thread looks like right after `quackId` is deleted, before
// the server answers — mirroring what the server does (docs/adr/0001): a
// quack with replies stays as a tombstone, any other quack disappears.
export function applyDelete(quacks: Quack[], quackId: string): Quack[] {
  const target = quacks.find((quack) => quack.id === quackId)
  if (!target) return quacks

  // Top-level quacks carry the thread's count; in a thread the replies are
  // right there in the list.
  const hasReplies = target.replyCount > 0 || quacks.some((quack) => quack.parentId === quackId)
  if (!hasReplies) return quacks.filter((quack) => quack.id !== quackId)

  return quacks.map((quack) =>
    quack.id === quackId
      ? {
          ...quack,
          text: null,
          mood: null,
          userId: null,
          user: null,
          poll: null,
          deletedAt: new Date(),
        }
      : quack,
  )
}
