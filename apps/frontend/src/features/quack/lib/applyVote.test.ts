import { describe, expect, it } from "vitest"

import type { QuackPoll } from "@/features/quack/api/quackSchemas"
import { applyVote } from "@/features/quack/lib/applyVote"

// "Where do we go for lunch?" from the seed: Pizza 3, Sushi 1, Canteen 0.
const lunchPoll = (myVoteOptionId: string | null = null): QuackPoll => ({
  options: [
    { id: "pizza", text: "Pizza", votes: 3 },
    { id: "sushi", text: "Sushi", votes: 1 },
    { id: "canteen", text: "Canteen", votes: 0 },
  ],
  totalVotes: 4,
  myVoteOptionId,
})

const votes = (poll: QuackPoll) => poll.options.map((option) => option.votes)

describe("applyVote", () => {
  it("adds a first vote and grows the total", () => {
    const poll = applyVote(lunchPoll(), "canteen")

    expect(votes(poll)).toEqual([3, 1, 1])
    expect(poll.totalVotes).toBe(5)
    expect(poll.myVoteOptionId).toBe("canteen")
  })

  it("moves a vote without changing the total", () => {
    // Migration Season voted Sushi and changes their mind.
    const poll = applyVote(lunchPoll("sushi"), "pizza")

    expect(votes(poll)).toEqual([4, 0, 0])
    expect(poll.totalVotes).toBe(4)
    expect(poll.myVoteOptionId).toBe("pizza")
  })

  it("changes nothing when voting for the same option again", () => {
    const before = lunchPoll("sushi")

    expect(applyVote(before, "sushi")).toBe(before)
  })

  it("leaves the original poll untouched", () => {
    const before = lunchPoll("sushi")

    applyVote(before, "pizza")

    expect(votes(before)).toEqual([3, 1, 0])
    expect(before.myVoteOptionId).toBe("sushi")
  })
})
