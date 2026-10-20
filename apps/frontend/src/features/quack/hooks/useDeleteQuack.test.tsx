import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { DELETE_FAILED_MESSAGE, useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

const { deleteQuack, toastError } = vi.hoisted(() => ({
  deleteQuack: vi.fn(),
  toastError: vi.fn(),
}))

// A real QueryClient holds the feed; only the request and the toast are mocked.
vi.mock("@/features/quack/api/deleteQuack", () => ({ deleteQuack }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

const caffeinatedDuck = { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" }

const quack = (id: string, text: string): Quack => ({
  id,
  text,
  mood: null,
  userId: caffeinatedDuck.id,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: caffeinatedDuck,
  poll: null,
})

const espresso = quack("q-espresso", "third espresso and i can hear colours now")
const lunch = quack("q-lunch", "Where do we go for lunch?")

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(quackKeys.lists(), [espresso, lunch])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useDeleteQuack(), { wrapper })
  const feedIds = () => queryClient.getQueryData<Quack[]>(quackKeys.lists())?.map((q) => q.id)
  return { queryClient, result, feedIds }
}

describe("useDeleteQuack", () => {
  beforeEach(() => {
    deleteQuack.mockReset()
    toastError.mockReset()
  })

  it("removes the quack from the feed before the server answers", async () => {
    deleteQuack.mockReturnValue(new Promise(() => undefined))
    const { result, feedIds } = setup()

    act(() => result.current.mutate({ quackId: "q-espresso" }))

    await waitFor(() => expect(feedIds()).toEqual(["q-lunch"]))
    expect(deleteQuack.mock.calls[0]?.[0]).toEqual({ quackId: "q-espresso" })
  })

  it("reloads the feed once the delete is through", async () => {
    deleteQuack.mockResolvedValue(undefined)
    const { queryClient, result } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ quackId: "q-espresso" }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("says so and reloads the feed when the delete fails", async () => {
    deleteQuack.mockRejectedValue(new Error("Forbidden"))
    const { queryClient, result } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ quackId: "q-espresso" }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(DELETE_FAILED_MESSAGE))
    // The refetch brings the quack back.
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
  })
})
