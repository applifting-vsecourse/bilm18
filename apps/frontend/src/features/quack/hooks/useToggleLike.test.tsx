import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { LIKE_FAILED_MESSAGE, useToggleLike } from "@/features/quack/hooks/useToggleLike"
import type { LikeState } from "@/features/quack/lib/toggleLike"

const { setLike, toastError } = vi.hoisted(() => ({
  setLike: vi.fn(),
  toastError: vi.fn(),
}))

// A real QueryClient holds the feed; only the request and the toast are mocked.
vi.mock("@/features/quack/api/setLike", () => ({ setLike }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

type QuackWithLikes = Quack & LikeState

// "just spilled coffee on my keyboard" by Caffeinated Duck, nobody likes it yet.
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
  likeCount: 0,
  likedByMe: false,
}

// A request that stays in flight until the test settles it.
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(quackKeys.list("all"), [spilledCoffee])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useToggleLike(), { wrapper })
  const likes = (): LikeState | undefined => {
    const quack = queryClient.getQueryData<QuackWithLikes[]>(quackKeys.list("all"))?.[0]
    return quack ? { likeCount: quack.likeCount, likedByMe: quack.likedByMe } : undefined
  }
  return { queryClient, result, likes }
}

// cases.md, A: R14–R16.
describe("useToggleLike", () => {
  beforeEach(() => {
    setLike.mockReset()
    toastError.mockReset()
  })

  it("R14: shows the like before the server answers", async () => {
    const request = deferred<LikeState>()
    setLike.mockReturnValue(request.promise)
    const { result, likes } = setup()

    act(() => result.current.mutate({ quackId: "q-coffee", liked: true }))

    await waitFor(() => expect(likes()).toEqual({ likeCount: 1, likedByMe: true }))
    await waitFor(() => expect(setLike).toHaveBeenCalledTimes(1))
    expect(setLike.mock.calls[0]?.[0]).toEqual({ quackId: "q-coffee", liked: true })
  })

  it("R15: goes back to how it was and says so when the like fails", async () => {
    const request = deferred<LikeState>()
    setLike.mockReturnValue(request.promise)
    const { result, likes } = setup()

    act(() => result.current.mutate({ quackId: "q-coffee", liked: true }))
    await waitFor(() => expect(likes()).toEqual({ likeCount: 1, likedByMe: true }))

    // e.g. 404: the quack was deleted in the meantime.
    await act(async () => {
      request.reject(new Error("Quack not found"))
      await request.promise.catch(() => undefined)
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(LIKE_FAILED_MESSAGE))
    expect(likes()).toEqual({ likeCount: 0, likedByMe: false })
  })

  it("R16: reloads the quacks once the like is through", async () => {
    setLike.mockResolvedValue({ likeCount: 1, likedByMe: true })
    const { queryClient, result } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ quackId: "q-coffee", liked: true }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("R16: reloads the quacks after a failed like too", async () => {
    setLike.mockRejectedValue(new Error("Quack not found"))
    const { queryClient, result } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ quackId: "q-coffee", liked: true }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(LIKE_FAILED_MESSAGE))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
  })
})
