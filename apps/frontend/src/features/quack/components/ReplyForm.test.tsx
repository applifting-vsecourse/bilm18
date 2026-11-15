import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ReplyForm } from "@/features/quack/components/ReplyForm"

const { mutate, mutation } = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutation: { error: null as { message: string; isGone?: boolean } | null },
}))

// The form owns its fields; the mutation is mocked so no API or QueryClient is needed.
vi.mock("@/features/quack/hooks/useAddReply", () => ({
  useAddReply: () => ({ mutate, isPending: false, error: mutation.error }),
  isReplyToDeletedQuack: (error: { isGone?: boolean } | null) => error?.isGone === true,
  REPLY_TO_DELETED_MESSAGE: "That quack was deleted, so you can't reply to it.",
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
    mutation.error = null
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

  it("keeps what was typed when the quack turns out to be deleted", () => {
    const onClose = vi.fn()
    mutation.error = { message: "Not Found", isGone: true }
    replyToCoffee({ onClose })

    expect(
      screen.getByText("That quack was deleted, so you can't reply to it."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reply" })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("says who it replied to even when that quack is already deleted", () => {
    replyToCoffee({ authorUsername: null })

    expect(screen.getByLabelText("Reply to a deleted quack")).toBeInTheDocument()
  })

  it("shows other errors in the form and lets the user retry", () => {
    mutation.error = { message: "Network down" }
    replyToCoffee()

    expect(screen.getByText("Network down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reply" })).toBeEnabled()
  })

  it("reports what is typed, and starts from a draft it was given", async () => {
    const onDraftChange = vi.fn()
    replyToCoffee({ onDraftChange, draft: { text: "Rice", mood: "silly" } })

    expect(screen.getByLabelText("Reply to @CaffeinatedDuck")).toHaveValue("Rice")
    expect(screen.getByRole("radio", { name: "Silly" })).toHaveAttribute("aria-checked", "true")

    await userEvent.type(screen.getByLabelText("Reply to @CaffeinatedDuck"), " works")

    expect(onDraftChange).toHaveBeenLastCalledWith({ text: "Rice works", mood: "silly" })
  })

  it("offers no poll — replies have none", () => {
    replyToCoffee()

    expect(screen.queryByRole("button", { name: "Add poll" })).not.toBeInTheDocument()
  })
})
