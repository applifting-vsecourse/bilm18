import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { filterQuacks } from "@/features/quack/lib/filterQuacks"

const breadCritic = { id: "u1", name: "The Bread Critic", username: "BreadCritic" }
const caffeinatedDuck = { id: "u2", name: "Caffeinated Duck", username: "CaffeinatedDuck" }
const deepDuckThoughts = { id: "u3", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" }

const quack = (id: string, user: Quack["user"], text: string): Quack => ({
  id,
  text,
  userId: user.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user,
})

// A slice of the seed data, newest first like the feed.
const multigrain = quack("q4", breadCritic, "Multigrain. Seeds still attached. Genuinely nutritious.")
const espresso = quack("q3", caffeinatedDuck, "third espresso and i can hear colours now\none of them is quacking")
const pond = quack("q2", deepDuckThoughts, "If a pond reflects the sky, is the sky just a very large and very shy pond?")
const sourdough = quack("q1", breadCritic, "Sourdough. Thrown by a child. Landed two metres short of anyone.")
const feed = [multigrain, espresso, pond, sourdough]

describe("filterQuacks", () => {
  it("returns the whole feed for an empty term", () => {
    expect(filterQuacks(feed, "")).toEqual(feed)
  })

  it("returns the whole feed for a whitespace-only term", () => {
    expect(filterQuacks(feed, "   ")).toEqual(feed)
  })

  it("matches text regardless of case", () => {
    expect(filterQuacks(feed, "SOURDOUGH")).toEqual([sourdough])
  })

  it("matches the username, ignoring a leading @", () => {
    expect(filterQuacks(feed, "@breadcritic")).toEqual([multigrain, sourdough])
  })

  it("matches the display name", () => {
    expect(filterQuacks(feed, "bread critic")).toEqual([multigrain, sourdough])
  })

  it("trims surrounding whitespace", () => {
    expect(filterQuacks(feed, "  espresso  ")).toEqual([espresso])
  })

  it("matches a phrase, not separate words", () => {
    expect(filterQuacks(feed, "sky pond")).toEqual([])
  })

  it("keeps feed order across fields", () => {
    // "duck" hits espresso and pond via their authors' names.
    expect(filterQuacks(feed, "duck")).toEqual([espresso, pond])
  })

  it("returns nothing when no field matches", () => {
    expect(filterQuacks(feed, "heron")).toEqual([])
  })
})
