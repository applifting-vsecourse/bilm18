import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QuackForm } from "@/features/quack/components/QuackForm"

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

// The form owns its fields; the mutation is mocked so no API or QueryClient is needed.
vi.mock("@/features/quack/hooks/useAddQuack", () => ({
  useAddQuack: () => ({ mutate, isPending: false, error: null }),
}))

const submit = () => userEvent.click(screen.getByRole("button", { name: "Quack" }))

describe("QuackForm", () => {
  beforeEach(() => {
    mutate.mockReset()
  })

  it("offers the four moods in a labelled group", () => {
    render(<QuackForm />)

    const group = screen.getByRole("radiogroup", { name: "Mood" })
    expect(group).toBeInTheDocument()
    for (const name of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument()
    }
  })

  it("sends the chosen mood with the quack", async () => {
    render(<QuackForm />)

    await userEvent.type(screen.getByLabelText("New quack"), "third espresso")
    await userEvent.click(screen.getByRole("radio", { name: "Silly" }))
    await submit()

    expect(mutate).toHaveBeenCalledWith(
      { text: "third espresso", mood: "silly" },
      expect.anything(),
    )
  })

  it("posts without a mood when none is chosen", async () => {
    render(<QuackForm />)

    await userEvent.type(screen.getByLabelText("New quack"), "quack")
    await submit()

    expect(mutate).toHaveBeenCalledWith({ text: "quack", mood: undefined }, expect.anything())
  })

  it("clears the mood when the chosen one is pressed again", async () => {
    render(<QuackForm />)

    await userEvent.type(screen.getByLabelText("New quack"), "quack")
    const silly = screen.getByRole("radio", { name: "Silly" })
    await userEvent.click(silly)
    await userEvent.click(silly)
    await submit()

    expect(silly).toHaveAttribute("aria-checked", "false")
    expect(mutate).toHaveBeenCalledWith({ text: "quack", mood: undefined }, expect.anything())
  })
})
