import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "third espresso and i can hear colours now",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
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

  it("has no delete action without onDelete", () => {
    render(<QuackItem quack={quack()} />)

    expect(screen.queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
  })

  it("asks before deleting and deletes on confirm", async () => {
    const onDelete = vi.fn()
    render(
      <QuackItem
        quack={quack()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    expect(screen.getByRole("alertdialog", { name: "Delete this quack?" })).toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it("names the author when an admin deletes someone else's quack", async () => {
    const onDelete = vi.fn()
    render(
      <QuackItem
        quack={quack()}
        onDelete={onDelete}
        isOwn={false}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    expect(
      screen.getByRole("alertdialog", { name: "Delete @CaffeinatedDuck's quack?" }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it("keeps the quack when the user cancels", async () => {
    const onDelete = vi.fn()
    render(
      <QuackItem
        quack={quack()}
        onDelete={onDelete}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })
})
