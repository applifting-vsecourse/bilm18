import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { quacksByAuthor } from "@/features/quack/lib/quacksByAuthor"

const breadCritic = { id: "u1", name: "The Bread Critic", username: "BreadCritic" }
const caffeinatedDuck = { id: "u2", name: "Caffeinated Duck", username: "CaffeinatedDuck" }

const quack = (id: string, user: Quack["user"], text: string): Quack => ({
  id,
  text,
  mood: null,
  userId: user.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user,
  poll: null,
})

// A slice of the seed data, newest first like the feed.
const multigrain = quack(
  "q3",
  breadCritic,
  "Multigrain. Seeds still attached. Genuinely nutritious.",
)
const espresso = quack(
  "q2",
  caffeinatedDuck,
  "third espresso and i can hear colours now\none of them is quacking",
)
const sourdough = quack(
  "q1",
  breadCritic,
  "Sourdough. Thrown by a child. Landed two metres short of anyone.",
)
const feed = [multigrain, espresso, sourdough]

describe("quacksByAuthor", () => {
  it("keeps only the author's quacks, in feed order", () => {
    expect(quacksByAuthor(feed, breadCritic.id)).toEqual([multigrain, sourdough])
  })

  it("returns nothing for someone who hasn't posted", () => {
    expect(quacksByAuthor(feed, "u-migration-season")).toEqual([])
  })
})
