import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack, QuackPoll } from "@/features/quack/api/quackSchemas"
import { useVote, VOTE_FAILED_MESSAGE } from "@/features/quack/hooks/useVote"

const { voteInPoll, toastError } = vi.hoisted(() => ({
  voteInPoll: vi.fn(),
  toastError: vi.fn(),
}))

// A real QueryClient holds the feed; only the request and the toast are mocked.
vi.mock("@/features/quack/api/voteInPoll", () => ({ voteInPoll }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

// "Where do we go for lunch?" from the seed, before Caffeinated Duck votes.
const lunchQuack: Quack = {
  id: "q-lunch",
  text: "Where do we go for lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: {
    options: [
      { id: "pizza", text: "Pizza", votes: 3 },
      { id: "sushi", text: "Sushi", votes: 1 },
      { id: "canteen", text: "Canteen", votes: 0 },
    ],
    totalVotes: 4,
    myVoteOptionId: null,
  },
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
  queryClient.setQueryData(quackKeys.lists(), [lunchQuack])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useVote(), { wrapper })
  const poll = () => queryClient.getQueryData<Quack[]>(quackKeys.lists())?.[0]?.poll
  return { queryClient, result, poll }
}

describe("useVote", () => {
  beforeEach(() => {
    voteInPoll.mockReset()
    toastError.mockReset()
  })

  it("shows the vote before the server answers", async () => {
    const request = deferred<QuackPoll>()
    voteInPoll.mockReturnValue(request.promise)
    const { result, poll } = setup()

    act(() => result.current.mutate({ quackId: "q-lunch", optionId: "canteen" }))

    await waitFor(() => expect(poll()?.myVoteOptionId).toBe("canteen"))
    expect(poll()?.options.map((option) => option.votes)).toEqual([3, 1, 1])
    expect(poll()?.totalVotes).toBe(5)
    await waitFor(() => expect(voteInPoll).toHaveBeenCalledTimes(1))
    expect(voteInPoll.mock.calls[0]?.[0]).toEqual({ quackId: "q-lunch", optionId: "canteen" })
  })

  it("goes back to how it was and says so when the vote fails", async () => {
    const request = deferred<QuackPoll>()
    voteInPoll.mockReturnValue(request.promise)
    const { result, poll } = setup()

    act(() => result.current.mutate({ quackId: "q-lunch", optionId: "canteen" }))
    await waitFor(() => expect(poll()?.myVoteOptionId).toBe("canteen"))

    await act(async () => {
      request.reject(new Error("Network down"))
      await request.promise.catch(() => undefined)
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(VOTE_FAILED_MESSAGE))
    expect(poll()).toEqual(lunchQuack.poll)
  })

  it("reloads the real counts once the vote is through", async () => {
    voteInPoll.mockResolvedValue(lunchQuack.poll)
    const { queryClient, result } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ quackId: "q-lunch", optionId: "pizza" }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: quackKeys.all() }))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("keeps a newer click when an older one fails", async () => {
    const first = deferred<QuackPoll>()
    const second = deferred<QuackPoll>()
    voteInPoll.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, poll } = setup()

    // Pizza, then quickly Sushi.
    act(() => result.current.mutate({ quackId: "q-lunch", optionId: "pizza" }))
    await waitFor(() => expect(poll()?.myVoteOptionId).toBe("pizza"))
    act(() => result.current.mutate({ quackId: "q-lunch", optionId: "sushi" }))
    await waitFor(() => expect(poll()?.myVoteOptionId).toBe("sushi"))

    await act(async () => {
      first.reject(new Error("Network down"))
      await first.promise.catch(() => undefined)
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(VOTE_FAILED_MESSAGE))
    // Sushi is still on its way, so the feed keeps showing it.
    expect(poll()?.myVoteOptionId).toBe("sushi")
  })
})
