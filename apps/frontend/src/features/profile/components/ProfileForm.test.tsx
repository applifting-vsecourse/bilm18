import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

const { mutate, toastSuccess } = vi.hoisted(() => ({ mutate: vi.fn(), toastSuccess: vi.fn() }))

// The form owns its fields; the mutation is mocked so no API or QueryClient is needed.
vi.mock("@/features/profile/hooks/useUpdateProfile", () => ({
  useUpdateProfile: () => ({ mutate, reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock("sonner", () => ({ toast: { success: toastSuccess } }))

const caffeinatedDuck: Profile = {
  username: "CaffeinatedDuck",
  name: "Caffeinated Duck",
  bio: null,
  defaultMood: null,
}

type MutateOptions = {
  onSuccess?: (saved: Profile) => void
  onError?: (error: Error) => void
}

const usernameField = () => screen.getByLabelText("Username")
const save = () => userEvent.click(screen.getByRole("button", { name: "Save" }))

// Stand-in for what ky throws when the server answers 409 Conflict.
const conflict = (message: string) =>
  Object.assign(Object.create(HTTPError.prototype) as HTTPError, {
    message,
    response: new Response(null, { status: 409 }),
  })

describe("ProfileForm", () => {
  beforeEach(() => {
    mutate.mockReset()
    toastSuccess.mockReset()
  })

  it("starts with the saved profile", () => {
    render(
      <ProfileForm profile={{ ...caffeinatedDuck, bio: "third espresso", defaultMood: "silly" }} />,
    )

    expect(usernameField()).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Display name")).toHaveValue("Caffeinated Duck")
    expect(screen.getByLabelText("Bio")).toHaveValue("third espresso")
    expect(screen.getByRole("radio", { name: "Silly" })).toHaveAttribute("aria-checked", "true")
  })

  it("offers no mood plus the four moods as the default", () => {
    render(<ProfileForm profile={caffeinatedDuck} />)

    expect(
      screen.getByRole("radiogroup", { name: "Default mood for new quacks" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "None" })).toHaveAttribute("aria-checked", "true")
    for (const name of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument()
    }
  })

  it("saves the changes and confirms it", async () => {
    mutate.mockImplementation((input: Profile, options: MutateOptions) =>
      options.onSuccess?.(input),
    )
    render(<ProfileForm profile={caffeinatedDuck} />)

    await userEvent.clear(usernameField())
    await userEvent.type(usernameField(), "Decaf.Duck_2")
    await userEvent.type(screen.getByLabelText("Bio"), "now off coffee")
    await userEvent.click(screen.getByRole("radio", { name: "Sad" }))
    await save()

    expect(mutate).toHaveBeenCalledWith(
      {
        username: "Decaf.Duck_2",
        name: "Caffeinated Duck",
        bio: "now off coffee",
        defaultMood: "sad",
      },
      expect.anything(),
    )
    expect(toastSuccess).toHaveBeenCalledWith("Profile saved")
  })

  it("sends an empty bio as no bio", async () => {
    render(<ProfileForm profile={{ ...caffeinatedDuck, bio: "third espresso" }} />)

    await userEvent.clear(screen.getByLabelText("Bio"))
    await save()

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ bio: null }), expect.anything())
  })

  it.each(["ab", "a".repeat(31), "bread critic", "bread-critic"])(
    "rejects the username %j before sending",
    async (username) => {
      render(<ProfileForm profile={caffeinatedDuck} />)

      await userEvent.clear(usernameField())
      await userEvent.type(usernameField(), username)
      await save()

      expect(
        screen.getByText("Use 3–30 characters: letters, numbers, dots and underscores"),
      ).toBeInTheDocument()
      expect(mutate).not.toHaveBeenCalled()
    },
  )

  it("requires a display name and keeps the bio to 160 characters", async () => {
    render(<ProfileForm profile={caffeinatedDuck} />)

    await userEvent.clear(screen.getByLabelText("Display name"))
    await userEvent.click(screen.getByLabelText("Bio"))
    await userEvent.paste("q".repeat(161))
    await save()

    expect(screen.getByText("Display name is required")).toBeInTheDocument()
    expect(screen.getByText("Keep it under 160 characters")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("shows a taken username at the field and keeps what was typed", async () => {
    mutate.mockImplementation((_input: Profile, options: MutateOptions) =>
      options.onError?.(conflict("That username is already taken")),
    )
    render(<ProfileForm profile={caffeinatedDuck} />)

    await userEvent.clear(usernameField())
    await userEvent.type(usernameField(), "BreadCritic")
    await save()

    expect(
      await screen.findByText("@BreadCritic is already taken. Try a different username."),
    ).toBeInTheDocument()
    expect(usernameField()).toHaveValue("BreadCritic")
    expect(usernameField()).toHaveAttribute("aria-invalid", "true")
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("discards changes back to the saved profile", async () => {
    render(<ProfileForm profile={caffeinatedDuck} />)

    await userEvent.clear(usernameField())
    await userEvent.type(usernameField(), "BreadCritic")
    await userEvent.type(screen.getByLabelText("Bio"), "crumbs")
    await userEvent.click(screen.getByRole("radio", { name: "Angry" }))
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(usernameField()).toHaveValue("CaffeinatedDuck")
    expect(screen.getByLabelText("Bio")).toHaveValue("")
    expect(screen.getByRole("radio", { name: "None" })).toHaveAttribute("aria-checked", "true")
    expect(mutate).not.toHaveBeenCalled()
  })

  it("discards back to the last save, not the original profile", async () => {
    mutate.mockImplementation((input: Profile, options: MutateOptions) =>
      options.onSuccess?.(input),
    )
    render(<ProfileForm profile={caffeinatedDuck} />)

    await userEvent.clear(usernameField())
    await userEvent.type(usernameField(), "DecafDuck")
    await save()
    await userEvent.type(usernameField(), "_typo")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(usernameField()).toHaveValue("DecafDuck")
  })
})
