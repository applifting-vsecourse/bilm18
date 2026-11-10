import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { buildThreadTree, type ThreadNode } from "@/features/quack/lib/buildThreadTree"

const caffeinatedDuck = { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" }
const breadCritic = { id: "u3", name: "The Bread Critic", username: "BreadCritic" }
const deepDuckThoughts = { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" }

let minute = 0
const quack = (
  id: string,
  user: Quack["user"],
  text: string | null,
  parentId: string | null = null,
): Quack => ({
  id,
  text,
  mood: null,
  userId: user?.id ?? null,
  createdAt: new Date(Date.UTC(2026, 0, 1, 12, minute++)),
  deletedAt: user ? null : new Date(Date.UTC(2026, 0, 2)),
  parentId,
  rootId: parentId ? "q-coffee" : null,
  user,
  poll: null,
  replyCount: 0,
  parent: null,
})

// The seed thread, in the order the API sends it (oldest first).
const spilledCoffee = quack("q-coffee", caffeinatedDuck, "just spilled coffee on my keyboard")
const riceWorks = quack("q-rice", breadCritic, "Rice works. So does bread, allegedly.", "q-coffee")
const wetKeyboard = quack(
  "q-wet",
  deepDuckThoughts,
  "Is the keyboard wet, or is the coffee just very dry?",
  "q-coffee",
)
const sourdoughKeyboard = quack(
  "q-sourdough",
  caffeinatedDuck,
  "it was a sourdough keyboard now",
  "q-rice",
)

// id, depth and replyingTo per node — enough to read the shape at a glance.
type Shape = { id: string; depth: number; replyingTo?: string | null; replies: Shape[] }
const shape = (node: ThreadNode): Shape => ({
  id: node.quack.id,
  depth: node.depth,
  ...(node.replyingTo ? { replyingTo: node.replyingTo.username } : {}),
  replies: node.replies.map(shape),
})

describe("buildThreadTree", () => {
  it("puts each reply under the quack it answers, oldest first", () => {
    const tree = buildThreadTree([spilledCoffee, riceWorks, wetKeyboard, sourdoughKeyboard])

    expect(tree && shape(tree)).toEqual({
      id: "q-coffee",
      depth: 0,
      replies: [
        {
          id: "q-rice",
          depth: 1,
          replies: [{ id: "q-sourdough", depth: 2, replies: [] }],
        },
        { id: "q-wet", depth: 1, replies: [] },
      ],
    })
  })

  it("orders replies by time even when the list is not", () => {
    const tree = buildThreadTree([wetKeyboard, spilledCoffee, riceWorks])

    expect(tree?.replies.map((node) => node.quack.id)).toEqual(["q-rice", "q-wet"])
  })

  it("keeps a deleted quack in the middle of the thread with its replies under it", () => {
    const deletedRice = quack("q-rice", null, null, "q-coffee")
    const reply = quack("q-sourdough", caffeinatedDuck, "it was a sourdough keyboard now", "q-rice")

    const tree = buildThreadTree([spilledCoffee, deletedRice, reply])

    expect(tree?.replies[0]?.quack.deletedAt).not.toBeNull()
    expect(tree?.replies[0]?.replies[0]?.quack.id).toBe("q-sourdough")
  })

  it("stops indenting at the third level and says who deeper replies answer", () => {
    // coffee ← 1 ← 2 ← 3 ← 4 ← 5, alternating authors
    const chain = [spilledCoffee]
    for (let level = 1; level <= 5; level++) {
      const user = level % 2 === 1 ? breadCritic : caffeinatedDuck
      chain.push(quack(`q-${level}`, user, `level ${level}`, chain[level - 1]!.id))
    }

    const tree = buildThreadTree(chain)

    expect(tree && shape(tree)).toEqual({
      id: "q-coffee",
      depth: 0,
      replies: [
        {
          id: "q-1",
          depth: 1,
          replies: [
            {
              id: "q-2",
              depth: 2,
              replies: [
                { id: "q-3", depth: 3, replies: [] },
                // Same level as q-3, right after it.
                { id: "q-4", depth: 3, replyingTo: "BreadCritic", replies: [] },
                { id: "q-5", depth: 3, replyingTo: "CaffeinatedDuck", replies: [] },
              ],
            },
          ],
        },
      ],
    })
  })

  it("names no one when a deep reply answers a deleted quack", () => {
    const chain = [spilledCoffee]
    for (let level = 1; level <= 3; level++) {
      chain.push(quack(`q-${level}`, breadCritic, `level ${level}`, chain[level - 1]!.id))
    }
    chain.push(quack("q-deleted", null, null, "q-3"))
    chain.push(quack("q-deep", caffeinatedDuck, "still here", "q-deleted"))

    const tree = buildThreadTree(chain)
    const deepest = tree?.replies[0]?.replies[0]?.replies

    expect(deepest?.map((node) => [node.quack.id, node.replyingTo?.username])).toEqual([
      ["q-3", undefined],
      ["q-deleted", "BreadCritic"],
      ["q-deep", null],
    ])
  })

  it("returns null without a top-level quack", () => {
    expect(buildThreadTree([])).toBeNull()
    expect(buildThreadTree([riceWorks])).toBeNull()
  })
})
