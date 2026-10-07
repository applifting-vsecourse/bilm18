import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "third espresso and i can hear colours now",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  ...overrides,
})

describe("QuackItem", () => {
  it("shows the mood when the quack has one", () => {
    render(<QuackItem quack={quack({ mood: "silly" })} />)

    expect(screen.getByText("Silly")).toBeInTheDocument()
    expect(screen.getByText("Mood:")).toBeInTheDocument()
  })

  it("shows no mood when the quack has none", () => {
    render(<QuackItem quack={quack()} />)

    expect(screen.queryByText("Mood:")).not.toBeInTheDocument()
    // Only the separator between the handle and the time, as before moods.
    expect(screen.getAllByText("·")).toHaveLength(1)
  })
})
