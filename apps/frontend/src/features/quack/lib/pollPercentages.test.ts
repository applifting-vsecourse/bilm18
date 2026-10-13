import { describe, expect, it } from "vitest"

import type { QuackPoll } from "@/features/quack/api/quackSchemas"
import { pollPercentages } from "@/features/quack/lib/pollPercentages"

// "Where do we go for lunch?" from the seed.
const lunchPoll = (votes: [number, number, number]): QuackPoll => ({
  options: [
    { id: "o1", text: "Pizza", votes: votes[0] },
    { id: "o2", text: "Sushi", votes: votes[1] },
    { id: "o3", text: "Canteen", votes: votes[2] },
  ],
  totalVotes: votes[0] + votes[1] + votes[2],
  myVoteOptionId: null,
})

describe("pollPercentages", () => {
  it("gives each option its share of the votes", () => {
    expect(pollPercentages(lunchPoll([3, 1, 0]))).toEqual([75, 25, 0])
  })

  it("shows 0% everywhere before anyone votes", () => {
    expect(pollPercentages(lunchPoll([0, 0, 0]))).toEqual([0, 0, 0])
  })

  it("rounds each share to a whole number", () => {
    // 33.3% each — the shares add up to 99, which is fine.
    expect(pollPercentages(lunchPoll([1, 1, 1]))).toEqual([33, 33, 33])
  })

  it("gives a lone vote 100%", () => {
    expect(pollPercentages(lunchPoll([0, 1, 0]))).toEqual([0, 100, 0])
  })
})
