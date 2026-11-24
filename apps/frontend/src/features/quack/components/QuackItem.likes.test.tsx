import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import type { LikeState } from "@/features/quack/lib/toggleLike"

type QuackWithLikes = Quack & LikeState

// "just spilled coffee on my keyboard" by Caffeinated Duck, liked by two.
const spilledCoffee: QuackWithLikes = {
  id: "q-coffee",
  text: "just spilled coffee on my keyboard",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  deletedAt: null,
  parentId: null,
  rootId: null,
  replyCount: 3,
  parent: null,
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  likeCount: 2,
  likedByMe: false,
}

// The same quack once Caffeinated Duck deleted it while it had replies.
const tombstone: QuackWithLikes = {
  ...spilledCoffee,
  text: null,
  userId: null,
  user: null,
  deletedAt: new Date("2026-01-02T12:00:00Z"),
  likeCount: 0,
  likedByMe: false,
}

describe("QuackItem likes", () => {
  it("shows the like button and the count on a live quack", async () => {
    const onToggleLike = vi.fn()
    render(
      <QuackItem
        quack={spilledCoffee}
        onToggleLike={onToggleLike}
      />,
    )

    const like = within(screen.getByRole("article")).getByRole("button", { name: "Like" })
    expect(like).toHaveTextContent("2")

    await userEvent.click(like)
    expect(onToggleLike).toHaveBeenCalledOnce()
  })

  it("R13: a tombstone has neither the like button nor the count", () => {
    render(
      <QuackItem
        quack={tombstone}
        onToggleLike={vi.fn()}
      />,
    )

    expect(screen.getByText("This quack was deleted")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Like" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Unlike" })).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })
})
