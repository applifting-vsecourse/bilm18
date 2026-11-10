import type { Quack } from "@/features/quack/api/quackSchemas"

// Replies indent up to this depth. Deeper ones line up under the last
// indented level and say who they answer instead — keeps the thread
// readable on a phone.
export const MAX_THREAD_INDENT = 3

export type ThreadNode = {
  quack: Quack
  // 0 for the top-level quack, never more than MAX_THREAD_INDENT.
  depth: number
  // Set on replies deeper than the indentation goes, where the layout no
  // longer shows who they answer. `username` is null for a deleted quack.
  replyingTo?: { username: string | null }
  // Shown indented under this quack, oldest first.
  replies: ThreadNode[]
}

// Turns the flat thread from the API into what the thread page renders.
// null when the list has no top-level quack (an empty or broken thread).
export function buildThreadTree(quacks: Quack[]): ThreadNode | null {
  const root = quacks.find((quack) => quack.parentId === null)
  if (!root) return null

  const repliesTo = new Map<string, Quack[]>()
  for (const quack of quacks) {
    if (quack.parentId === null) continue
    const siblings = repliesTo.get(quack.parentId) ?? []
    siblings.push(quack)
    repliesTo.set(quack.parentId, siblings)
  }
  for (const siblings of repliesTo.values()) {
    siblings.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  // Returns the node — followed, once past the indentation limit, by its
  // whole subtree on the same level.
  const build = (quack: Quack, depth: number, parent: Quack | null): ThreadNode[] => {
    const below = (repliesTo.get(quack.id) ?? []).flatMap((reply) => build(reply, depth + 1, quack))
    const node: ThreadNode = {
      quack,
      depth: Math.min(depth, MAX_THREAD_INDENT),
      replies: depth < MAX_THREAD_INDENT ? below : [],
    }
    if (depth > MAX_THREAD_INDENT && parent) {
      node.replyingTo = { username: parent.user?.username ?? null }
    }
    return depth < MAX_THREAD_INDENT ? [node] : [node, ...below]
  }

  const [tree] = build(root, 0, null)
  return tree ?? null
}
