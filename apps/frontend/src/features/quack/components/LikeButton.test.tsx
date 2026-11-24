import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LikeButton } from "@/features/quack/components/LikeButton"

// cases.md, A: R10–R12.
describe("LikeButton", () => {
  it("R10: not liked — a Like button, not pressed, with the count 0", () => {
    render(
      <LikeButton
        likeCount={0}
        likedByMe={false}
        onToggle={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Like" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveTextContent("0")
    expect(screen.queryByRole("button", { name: "Unlike" })).not.toBeInTheDocument()
  })

  it("R11: liked — an Unlike button, pressed, with the count", () => {
    render(
      <LikeButton
        likeCount={2}
        likedByMe
        onToggle={vi.fn()}
      />,
    )

    const button = screen.getByRole("button", { name: "Unlike" })
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button).toHaveTextContent("2")
    expect(screen.queryByRole("button", { name: "Like" })).not.toBeInTheDocument()
  })

  it("R12: a click calls onToggle once and changes nothing by itself", async () => {
    const onToggle = vi.fn()
    render(
      <LikeButton
        likeCount={0}
        likedByMe={false}
        onToggle={onToggle}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Like" }))

    expect(onToggle).toHaveBeenCalledOnce()
    // Controlled: it stays as the props say until the parent passes new ones.
    expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("0")
  })
})
