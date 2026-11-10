import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReplyForm } from "@/features/quack/components/ReplyForm"

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

// The form owns its fields; the mutation is mocked so no API or QueryClient is needed.
vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate, isPending: false, error: null }),
  isReplyToDeletedQuack: () => false,
}))

const replyToCoffee = (props: Partial<Parameters<typeof ReplyForm>[0]> = {}) =>
  render(
    <ReplyForm
      quackId="q-coffee"
      authorUsername="CaffeinatedDuck"
      onClose={vi.fn()}
      {...props}
    />,
  )

const submit = () => userEvent.click(screen.getByRole("button", { name: "Reply" }))

describe("ReplyForm", () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  it("says who the reply is for, and is ready to type in", () => {
    replyToCoffee()

    expect(screen.getByLabelText("Reply to @CaffeinatedDuck")).toHaveFocus()
  })

  it("replies to the quack with the text and the chosen mood", async () => {
    replyToCoffee()

    await userEvent.type(
      screen.getByLabelText("Reply to @CaffeinatedDuck"),
      "Rice works. So does bread, allegedly.",
    )
    await userEvent.click(screen.getByRole("radio", { name: "Silly" }))
    await submit()

    expect(mutate).toHaveBeenCalledWith(
      { quackId: "q-coffee", text: "Rice works. So does bread, allegedly.", mood: "silly" },
      expect.anything(),
    )
  })

  it("starts with the default mood from Settings", () => {
    replyToCoffee({ defaultMood: "happy" })

    expect(screen.getByRole("radio", { name: "Happy" })).toHaveAttribute("aria-checked", "true")
  })

  it("doesn't send an empty reply", async () => {
    replyToCoffee()

    await submit()

    expect(await screen.findByText("Write something first")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("closes on Cancel without sending", async () => {
    const onClose = vi.fn()
    replyToCoffee({ onClose })

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("offers no poll — replies have none", () => {
    replyToCoffee()

    expect(screen.queryByRole("button", { name: "Add poll" })).not.toBeInTheDocument()
  })
})
