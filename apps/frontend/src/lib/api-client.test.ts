import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

const respondWith = (status: number, body: string, contentType = "application/json") =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(body, { status, headers: { "content-type": contentType } })),
    ),
  )

const errorFrom = (request: Promise<unknown>) =>
  request.then(
    () => null,
    (error: Error) => error,
  )

describe("api client errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses the server's message", async () => {
    respondWith(409, JSON.stringify({ message: "That username is already taken", statusCode: 409 }))

    const error = await errorFrom(api.patch("profile", { json: {} }).json())

    expect(error?.message).toBe("That username is already taken")
  })

  it("joins a list of validation messages", async () => {
    respondWith(400, JSON.stringify({ message: ["text should not be empty", "mood is invalid"] }))

    const error = await errorFrom(api.post("quacks", { json: {} }).json())

    expect(error?.message).toBe("text should not be empty, mood is invalid")
  })

  it("keeps the default message when the body isn't JSON", async () => {
    respondWith(502, "Bad Gateway", "text/plain")

    const error = await errorFrom(api.get("quacks").json())

    expect(error?.message).toMatch(/502/)
  })
})
