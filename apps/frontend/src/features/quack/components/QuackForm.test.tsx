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

  it("starts with the default mood from Settings", async () => {
    render(<QuackForm defaultMood="silly" />)

    expect(screen.getByRole("radio", { name: "Silly" })).toHaveAttribute("aria-checked", "true")

    await userEvent.type(screen.getByLabelText("New quack"), "third espresso")
    await submit()

    expect(mutate).toHaveBeenCalledWith(
      { text: "third espresso", mood: "silly" },
      expect.anything(),
    )
  })

  it("picks up the default mood when it arrives after the form", () => {
    const { rerender } = render(<QuackForm />)
    rerender(<QuackForm defaultMood="happy" />)

    expect(screen.getByRole("radio", { name: "Happy" })).toHaveAttribute("aria-checked", "true")
  })

  it("goes back to the default mood after posting", async () => {
    mutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    )
    render(<QuackForm defaultMood="sad" />)

    await userEvent.type(screen.getByLabelText("New quack"), "quack")
    await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
    await submit()

    expect(screen.getByRole("radio", { name: "Sad" })).toHaveAttribute("aria-checked", "true")
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

  describe("poll", () => {
    const lunch = "Where do we go for lunch?"
    const addPoll = () => userEvent.click(screen.getByRole("button", { name: "Add poll" }))
    const option = (n: number) => screen.getByLabelText(`Option ${n}`)

    it("posts a plain quack until a poll is added", async () => {
      render(<QuackForm />)

      expect(screen.queryByLabelText("Option 1")).not.toBeInTheDocument()

      await userEvent.type(screen.getByLabelText("New quack"), "quack")
      await submit()

      expect(mutate).toHaveBeenCalledWith(
        { text: "quack", mood: undefined, pollOptions: undefined },
        expect.anything(),
      )
    })

    it("starts a poll with two options", async () => {
      render(<QuackForm />)

      await addPoll()

      expect(option(1)).toBeInTheDocument()
      expect(option(2)).toBeInTheDocument()
      expect(screen.queryByLabelText("Option 3")).not.toBeInTheDocument()
      // Two is the minimum, so neither can be removed.
      expect(screen.queryByRole("button", { name: /Remove option/ })).not.toBeInTheDocument()
    })

    it("sends the options in order, trimmed", async () => {
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), lunch)
      await addPoll()
      await userEvent.click(screen.getByRole("button", { name: "Add option" }))
      await userEvent.type(option(1), " Pizza ")
      await userEvent.type(option(2), "Sushi")
      await userEvent.type(option(3), "Canteen")
      await submit()

      expect(mutate).toHaveBeenCalledWith(
        { text: lunch, mood: undefined, pollOptions: ["Pizza", "Sushi", "Canteen"] },
        expect.anything(),
      )
    })

    it("stops offering more options at seven", async () => {
      render(<QuackForm />)

      await addPoll()
      for (let i = 0; i < 5; i++) {
        await userEvent.click(screen.getByRole("button", { name: "Add option" }))
      }

      expect(option(7)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Add option" })).not.toBeInTheDocument()
    })

    it("removes an option above two", async () => {
      render(<QuackForm />)

      await addPoll()
      await userEvent.click(screen.getByRole("button", { name: "Add option" }))
      await userEvent.type(option(1), "Pizza")
      await userEvent.type(option(2), "Sushi")
      await userEvent.type(option(3), "Canteen")
      await userEvent.click(screen.getByRole("button", { name: "Remove option 2" }))

      expect(option(1)).toHaveValue("Pizza")
      expect(option(2)).toHaveValue("Canteen")
      expect(screen.queryByLabelText("Option 3")).not.toBeInTheDocument()
    })

    it("goes back to a plain quack when the poll is removed", async () => {
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), "quack")
      await addPoll()
      await userEvent.click(screen.getByRole("button", { name: "Remove poll" }))
      await submit()

      expect(mutate).toHaveBeenCalledWith(
        { text: "quack", mood: undefined, pollOptions: undefined },
        expect.anything(),
      )
    })

    it("refuses an empty option, also when it is only spaces", async () => {
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), lunch)
      await addPoll()
      await userEvent.type(option(1), "Pizza")
      await userEvent.type(option(2), "   ")
      await submit()

      expect(await screen.findByText("Options can't be empty")).toBeInTheDocument()
      expect(mutate).not.toHaveBeenCalled()
    })

    it("refuses an option over 50 characters", async () => {
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), lunch)
      await addPoll()
      await userEvent.type(option(1), "Pizza")
      await userEvent.type(option(2), "x".repeat(51))
      await submit()

      expect(await screen.findByText("Keep it under 50 characters")).toBeInTheDocument()
      expect(mutate).not.toHaveBeenCalled()
    })

    it('refuses "Pizza" and " pizza " as the same option, under the repeat', async () => {
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), lunch)
      await addPoll()
      await userEvent.click(screen.getByRole("button", { name: "Add option" }))
      await userEvent.type(option(1), "Pizza")
      await userEvent.type(option(2), "Sushi")
      await userEvent.type(option(3), " pizza ")
      await submit()

      expect(await screen.findAllByText("This option is already in the poll")).toHaveLength(1)
      expect(option(3)).toHaveAttribute("aria-invalid", "true")
      expect(option(1)).toHaveAttribute("aria-invalid", "false")
      expect(mutate).not.toHaveBeenCalled()
    })

    it("clears the poll after posting", async () => {
      mutate.mockImplementation((_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
      )
      render(<QuackForm />)

      await userEvent.type(screen.getByLabelText("New quack"), lunch)
      await addPoll()
      await userEvent.type(option(1), "Pizza")
      await userEvent.type(option(2), "Sushi")
      await submit()

      expect(screen.queryByLabelText("Option 1")).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Add poll" })).toBeInTheDocument()
    })
  })
})
