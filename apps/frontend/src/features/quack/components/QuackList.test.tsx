// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    render(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("invites the first post when the feed is empty", () => {
    render(<QuackList quacks={[]} />)

    expect(screen.getByText("No quacks yet. Post the first one.")).toBeInTheDocument()
  })

  it("names the search term when a search finds nothing", () => {
    render(
      <QuackList
        quacks={[]}
        searchTerm=" duck "
      />,
    )

    expect(screen.getByText('No quacks match "duck".')).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    render(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("offers delete on the viewer's own quacks only", async () => {
    const onDelete = vi.fn()
    render(
      <QuackList
        quacks={[
          quack({ id: "q-espresso", text: "third espresso" }),
          quack({
            id: "q-pond",
            text: "is the sky just a very large and very shy pond?",
            userId: "u2",
            user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
          }),
        ]}
        currentUserId="u1"
        onDelete={onDelete}
      />,
    )

    // getByRole throws if there is more than one: Deep Duck Thoughts' quack has none.
    await userEvent.click(screen.getByRole("button", { name: "Delete quack" }))
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledWith("q-espresso")
  })

  it("offers delete on every quack to an admin, naming the author of someone else's", async () => {
    const onDelete = vi.fn()
    render(
      <QuackList
        quacks={[
          quack({ id: "q-espresso", text: "third espresso" }),
          quack({
            id: "q-pond",
            text: "is the sky just a very large and very shy pond?",
            userId: "u2",
            user: { id: "u2", name: "Deep Duck Thoughts", username: "DeepDuckThoughts" },
          }),
        ]}
        currentUserId="u-superadmin"
        isAdmin
        onDelete={onDelete}
      />,
    )

    const deleteButtons = screen.getAllByRole("button", { name: "Delete quack" })
    expect(deleteButtons).toHaveLength(2)

    // Deep Duck Thoughts' quack, the second one — the length check above guarantees it.
    await userEvent.click(deleteButtons[1]!)
    expect(
      screen.getByRole("alertdialog", { name: "Delete @DeepDuckThoughts's quack?" }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledWith("q-pond")
  })

  it("invites the viewer to write their first quack on an empty Mine tab", async () => {
    const onWriteFirst = vi.fn()
    render(
      <QuackList
        quacks={[]}
        view="mine"
        onWriteFirst={onWriteFirst}
      />,
    )

    expect(
      screen.getByText("Your quacks will appear here. You haven't posted any yet."),
    ).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Write your first quack" }))
    expect(onWriteFirst).toHaveBeenCalledOnce()
  })

  it("names the search term on the Mine tab when a search finds nothing", () => {
    render(
      <QuackList
        quacks={[]}
        view="mine"
        searchTerm="duck"
      />,
    )

    expect(screen.getByText('No quacks match "duck".')).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Write your first quack" })).not.toBeInTheDocument()
  })
})
