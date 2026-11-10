import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { applyDelete } from "@/features/quack/lib/applyDelete"

const caffeinatedDuck = { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" }
const breadCritic = { id: "u3", name: "The Bread Critic", username: "BreadCritic" }

const quack = (overrides: Partial<Quack> & { id: string }): Quack => ({
  text: "quack",
  mood: null,
  userId: caffeinatedDuck.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  deletedAt: null,
  parentId: null,
  rootId: null,
  user: caffeinatedDuck,
  poll: null,
  replyCount: 0,
  parent: null,
  ...overrides,
})

const espresso = quack({ id: "q-espresso", text: "third espresso and i can hear colours now" })
const spilledCoffee = quack({
  id: "q-coffee",
  text: "just spilled coffee on my keyboard",
  mood: "silly",
  replyCount: 3,
})
const riceWorks = quack({
  id: "q-rice",
  text: "Rice works. So does bread, allegedly.",
  userId: breadCritic.id,
  user: breadCritic,
  parentId: "q-coffee",
  rootId: "q-coffee",
})
const sourdoughKeyboard = quack({
  id: "q-sourdough",
  text: "it was a sourdough keyboard now",
  parentId: "q-rice",
  rootId: "q-coffee",
})

describe("applyDelete", () => {
  it("removes a quack without replies", () => {
    expect(applyDelete([espresso, spilledCoffee], "q-espresso")).toEqual([spilledCoffee])
  })

  it("leaves a feed quack with replies as a tombstone", () => {
    const [deleted] = applyDelete([spilledCoffee], "q-coffee")

    expect(deleted).toMatchObject({
      id: "q-coffee",
      text: null,
      mood: null,
      userId: null,
      user: null,
      poll: null,
      replyCount: 3,
    })
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
  })

  it("leaves a reply with replies in a thread as a tombstone", () => {
    const thread = applyDelete([spilledCoffee, riceWorks, sourdoughKeyboard], "q-rice")

    expect(thread.map((q) => [q.id, q.deletedAt !== null])).toEqual([
      ["q-coffee", false],
      ["q-rice", true],
      ["q-sourdough", false],
    ])
  })

  it("removes the last reply in a thread", () => {
    expect(
      applyDelete([spilledCoffee, riceWorks, sourdoughKeyboard], "q-sourdough").map((q) => q.id),
    ).toEqual(["q-coffee", "q-rice"])
  })

  it("changes nothing when the quack isn't in the list", () => {
    const quacks = [espresso]
    expect(applyDelete(quacks, "q-missing")).toBe(quacks)
  })
})
