import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ReplyToDeletedQuack } from "@/features/quack/components/ReplyToDeletedQuack"

describe("ReplyToDeletedQuack", () => {
  it("says the quack is gone and keeps the unsent text to copy", () => {
    render(
      <ReplyToDeletedQuack
        draft={{ text: "Rice works. So does bread, allegedly." }}
        onDismiss={vi.fn()}
      />,
    )

    expect(
      screen.getByText("That quack was deleted, so you can't reply to it."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Your unsent reply")).toHaveValue(
      "Rice works. So does bread, allegedly.",
    )
  })

  it("shows no text box when nothing was typed", () => {
    render(
      <ReplyToDeletedQuack
        draft={{ text: "" }}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText("Your unsent reply")).not.toBeInTheDocument()
  })

  it("goes away on Dismiss", async () => {
    const onDismiss = vi.fn()
    render(<ReplyToDeletedQuack onDismiss={onDismiss} />)

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }))

    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
