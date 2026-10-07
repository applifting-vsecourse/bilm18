import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { filterQuacks } from "@/features/quack/lib/filterQuacks"

const quacks: Quack[] = [
  {
    id: "q2",
    text: "third espresso and i can hear colours now",
    mood: null,
    userId: "u1",
    createdAt: new Date("2026-01-02T12:00:00Z"),
    user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  },
  {
    id: "q1",
    text: "Sourdough. Thrown by a child.",
    mood: null,
    userId: "u2",
    createdAt: new Date("2026-01-01T12:00:00Z"),
    user: { id: "u2", name: "The Bread Critic", username: "BreadCritic" },
  },
]

// Wires search and list together the way the quacks page does.
function SearchableFeed() {
  const [searchTerm, setSearchTerm] = useState("")
  return (
    <>
      <QuackSearch
        value={searchTerm}
        onChange={setSearchTerm}
      />
      <QuackList
        quacks={filterQuacks(quacks, searchTerm)}
        searchTerm={searchTerm}
      />
    </>
  )
}

const searchInput = () => screen.getByLabelText("Search quacks")

describe("QuackSearch", () => {
  it("narrows the list while typing", async () => {
    render(<SearchableFeed />)

    await userEvent.type(searchInput(), "@breadcritic")

    expect(screen.getByText("Sourdough. Thrown by a child.")).toBeInTheDocument()
    expect(screen.queryByText("third espresso and i can hear colours now")).not.toBeInTheDocument()
  })

  it("says what was searched for when nothing matches", async () => {
    render(<SearchableFeed />)

    await userEvent.type(searchInput(), "  duckling ")

    expect(screen.getByText('No quacks match "duckling".')).toBeInTheDocument()
    expect(screen.queryByText("No quacks yet. Post the first one.")).not.toBeInTheDocument()
  })

  it("shows the clear button only when there is something to clear", async () => {
    render(<SearchableFeed />)

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()

    await userEvent.type(searchInput(), "espresso")

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument()
  })

  it("clears the search, restores the feed and refocuses the field", async () => {
    render(<SearchableFeed />)
    await userEvent.type(searchInput(), "espresso")

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))

    expect(searchInput()).toHaveValue("")
    expect(searchInput()).toHaveFocus()
    expect(screen.getByText("Sourdough. Thrown by a child.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()
  })

  it("clears the search on Escape", async () => {
    render(<SearchableFeed />)
    await userEvent.type(searchInput(), "espresso")

    await userEvent.keyboard("{Escape}")

    expect(searchInput()).toHaveValue("")
    expect(searchInput()).toHaveFocus()
    expect(screen.getByText("Sourdough. Thrown by a child.")).toBeInTheDocument()
  })
})
