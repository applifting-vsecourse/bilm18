import { describe, expect, it } from "vitest"

import { findDuplicateOptions } from "@/features/quack/lib/pollOptions"

describe("findDuplicateOptions", () => {
  it("finds nothing in the seed poll", () => {
    expect(findDuplicateOptions(["Pizza", "Sushi", "Canteen"])).toEqual([])
  })

  it("ignores case and the spaces around an option", () => {
    expect(findDuplicateOptions(["Pizza", "Sushi", " pizza "])).toEqual([2])
  })

  it("keeps the first one and flags every repeat", () => {
    expect(findDuplicateOptions(["Pizza", "PIZZA", "Sushi", "pizza"])).toEqual([1, 3])
  })

  it("leaves empty options to their own message", () => {
    expect(findDuplicateOptions(["", "  ", "Pizza"])).toEqual([])
  })
})
