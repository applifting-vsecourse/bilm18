import { describe, expect, it } from "vitest"

import { toggleLike } from "@/features/quack/lib/toggleLike"

// cases.md, A: R7–R9 — what a click shows before the server answers.
describe("toggleLike", () => {
  it("R7: a like adds one and marks it as mine", () => {
    expect(toggleLike({ likeCount: 3, likedByMe: false })).toEqual({
      likeCount: 4,
      likedByMe: true,
    })
  })

  it("R8: an unlike takes one off and unmarks it", () => {
    expect(toggleLike({ likeCount: 1, likedByMe: true })).toEqual({
      likeCount: 0,
      likedByMe: false,
    })
  })

  it("R9: never goes below zero, even on inconsistent data", () => {
    expect(toggleLike({ likeCount: 0, likedByMe: true })).toEqual({
      likeCount: 0,
      likedByMe: false,
    })
  })
})
