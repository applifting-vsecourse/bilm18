import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { QuackPoll } from "@/features/quack/components/QuackPoll"

// "Where do we go for lunch?" from the seed.
const lunchPoll = (overrides: Partial<QuackPollData> = {}): QuackPollData => ({
  options: [
    { id: "o1", text: "Pizza", votes: 3 },
    { id: "o2", text: "Sushi", votes: 1 },
    { id: "o3", text: "Canteen", votes: 0 },
  ],
  totalVotes: 4,
  myVoteOptionId: null,
  ...overrides,
})


describe("QuackPoll", () => {
  it("shows every option with its votes and share, in order", () => {
    render(<QuackPoll poll={lunchPoll()} />)

    const items = screen.getAllByRole("listitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Pizza3 · 75%",
      "Sushi1 · 25%",
      "Canteen0 · 0%",
    ])
  })

  it("shows the total number of votes", () => {
    render(<QuackPoll poll={lunchPoll()} />)

    expect(screen.getByText("4 votes")).toBeInTheDocument()
  })

  it("says 1 vote, not 1 votes", () => {
    render(
      <QuackPoll
        poll={lunchPoll({
          options: [
            { id: "o1", text: "Pizza", votes: 1 },
            { id: "o2", text: "Sushi", votes: 0 },
          ],
          totalVotes: 1,
        })}
      />,
    )

    expect(screen.getByText("1 vote")).toBeInTheDocument()
  })

  it("shows 0% everywhere before anyone votes", () => {
    render(
      <QuackPoll
        poll={lunchPoll({
          options: [
            { id: "o1", text: "Pizza", votes: 0 },
            { id: "o2", text: "Sushi", votes: 0 },
          ],
          totalVotes: 0,
        })}
      />,
    )

    expect(screen.getAllByText("0 · 0%")).toHaveLength(2)
    expect(screen.getByText("0 votes")).toBeInTheDocument()
  })

  it("marks my vote and only my vote", () => {
    render(<QuackPoll poll={lunchPoll({ myVoteOptionId: "o2" })} />)

    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("Sushi")
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(2)
  })

  it("marks nothing before I vote", () => {
    render(<QuackPoll poll={lunchPoll()} />)

    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument()
  })

  it("votes for the option I click", async () => {
    const onVote = vi.fn()
    render(
      <QuackPoll
        poll={lunchPoll()}
        onVote={onVote}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Canteen/ }))

    expect(onVote).toHaveBeenCalledWith("o3")
  })

  it("moves my vote when I click another option", async () => {
    const onVote = vi.fn()
    render(
      <QuackPoll
        poll={lunchPoll({ myVoteOptionId: "o2" })}
        onVote={onVote}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Pizza/ }))

    expect(onVote).toHaveBeenCalledWith("o1")
  })

  it("does nothing when I click my own vote again", async () => {
    const onVote = vi.fn()
    render(
      <QuackPoll
        poll={lunchPoll({ myVoteOptionId: "o2" })}
        onVote={onVote}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Sushi/ }))

    expect(onVote).not.toHaveBeenCalled()
  })

  it("is read-only without onVote", () => {
    render(<QuackPoll poll={lunchPoll()} />)

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
  })
})
