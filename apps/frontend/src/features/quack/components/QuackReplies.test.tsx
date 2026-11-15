// How replies show up in the feed and in Mine (QuackList), and on a
// deleted quack (QuackItem).
import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { QuackList } from "@/features/quack/components/QuackList"

// A plain link, so the tests need no router and can read where it leads.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    hash,
    children,
    ...rest
  }: {
    to: string
    params?: { quackId: string }
    hash?: string
    children: ReactNode
  }) => (
    <a
      href={`${to.replace("$quackId", params?.quackId ?? "")}${hash ? `#${hash}` : ""}`}
      {...rest}
    >
      {children}
    </a>
  ),
}))

vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  isReplyToDeletedQuack: () => false,
}))

const caffeinatedDuck = { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" }

const quack = (overrides: Partial<Quack> & { id: string }): Quack => ({
  text: "quack",
  mood: null,
  userId: caffeinatedDuck.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  deletedAt: null,
  parentId: null,
  rootId: null,
  user: caffeinatedDuck,
  poll: null,
  replyCount: 0,
  parent: null,
  ...overrides,
})

// The seed thread under "just spilled coffee".
const spilledCoffee = quack({
  id: "q-coffee",
  text: "just spilled coffee on my keyboard",
  replyCount: 3,
})
const sourdoughKeyboard = quack({
  id: "q-sourdough",
  text: "it was a sourdough keyboard now",
  parentId: "q-rice",
  rootId: "q-coffee",
  parent: { id: "q-rice", username: "BreadCritic" },
})
const deletedCoffee = quack({
  id: "q-coffee",
  text: null,
  userId: null,
  user: null,
  deletedAt: new Date("2026-01-02T12:00:00Z"),
  replyCount: 3,
})

describe("replies in the feed", () => {
  it("leads into the thread with how many replies it has", () => {
    render(<QuackList quacks={[spilledCoffee]} />)

    expect(screen.getByRole("link", { name: "3 replies — open thread" })).toHaveAttribute(
      "href",
      "/quacks/q-coffee",
    )
  })

  it("has no thread link without replies", () => {
    render(<QuackList quacks={[quack({ id: "q-espresso" })]} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("opens the reply form for the quack the user replies to", async () => {
    const onReplyOpen = vi.fn()
    const { rerender } = render(
      <QuackList
        quacks={[spilledCoffee]}
        onReplyOpen={onReplyOpen}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Reply" }))
    expect(onReplyOpen).toHaveBeenCalledWith("q-coffee")

    // The page holds which form is open.
    rerender(
      <QuackList
        quacks={[spilledCoffee]}
        onReplyOpen={onReplyOpen}
        replyFormFor="q-coffee"
      />,
    )
    expect(screen.getByLabelText("Reply to @CaffeinatedDuck")).toBeInTheDocument()
  })

  it("keeps a deleted quack with replies, without author or actions", () => {
    render(
      <QuackList
        quacks={[deletedCoffee]}
        currentUserId="u0"
        isAdmin
        onDelete={vi.fn()}
        onReplyOpen={vi.fn()}
      />,
    )

    expect(screen.getByText("This quack was deleted")).toBeInTheDocument()
    expect(screen.queryByText("Caffeinated Duck")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete quack" })).not.toBeInTheDocument()
    // The way into the thread stays.
    expect(screen.getByRole("link", { name: "3 replies — open thread" })).toBeInTheDocument()
  })
})

describe("replies in Mine", () => {
  it("says who a reply answers and leads to it in its thread", () => {
    render(
      <QuackList
        quacks={[sourdoughKeyboard]}
        view="mine"
      />,
    )

    expect(screen.getByRole("link", { name: "Replying to @BreadCritic" })).toHaveAttribute(
      "href",
      "/quacks/q-coffee#q-sourdough",
    )
  })

  it("says when the quack it answered was deleted", () => {
    render(
      <QuackList
        quacks={[{ ...sourdoughKeyboard, parent: { id: "q-rice", username: null } }]}
        view="mine"
      />,
    )

    expect(screen.getByRole("link", { name: "Replying to a deleted quack" })).toBeInTheDocument()
  })
})

describe("QuackItem for a deleted quack", () => {
  it("shows no text, author, time or mood", () => {
    render(<QuackItem quack={{ ...deletedCoffee, mood: null }} />)

    expect(screen.getByText("This quack was deleted")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByText("·")).not.toBeInTheDocument()
  })
})
