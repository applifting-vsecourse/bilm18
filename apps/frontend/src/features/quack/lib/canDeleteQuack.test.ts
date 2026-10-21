import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { canDeleteQuack } from "@/features/quack/lib/canDeleteQuack"

const caffeinatedDuck = { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" }

const espresso: Quack = {
  id: "q-espresso",
  text: "third espresso and i can hear colours now\none of them is quacking",
  mood: null,
  userId: caffeinatedDuck.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: caffeinatedDuck,
  poll: null,
}

describe("canDeleteQuack", () => {
  it("lets the author delete their own quack", () => {
    expect(canDeleteQuack(espresso, "u1")).toBe(true)
  })

  it("doesn't let anyone else delete it", () => {
    expect(canDeleteQuack(espresso, "u-deep-duck-thoughts")).toBe(false)
  })

  it("lets an admin delete someone else's quack", () => {
    expect(canDeleteQuack(espresso, "u-superadmin", true)).toBe(true)
  })

  it("never offers delete when nobody is signed in", () => {
    expect(canDeleteQuack(espresso, undefined)).toBe(false)
  })
})
