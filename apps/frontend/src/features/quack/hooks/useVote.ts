import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { voteInPoll } from "@/features/quack/api/voteInPoll"
import { applyVote } from "@/features/quack/lib/applyVote"

export const VOTE_FAILED_MESSAGE = "Your vote didn't go through. Try again."

const voteMutationKey = ["quacks", "vote"] as const

// Voting feels instant: the feed shows the new vote straight away and the
// request catches up. If it fails, the feed goes back to how it was.
export function useVote() {
  const queryClient = useQueryClient()

  // Another vote still on its way? Then the feed already shows that one, and
  // restoring or refetching now would wipe it.
  const isLastVoteInFlight = () => queryClient.isMutating({ mutationKey: voteMutationKey }) === 1

  return useMutation({
    mutationKey: voteMutationKey,
    mutationFn: voteInPoll,
    // Votes reach the server one at a time, in click order, so the last
    // click is the one that sticks.
    scope: { id: "quack-vote" },
    onMutate: async ({ quackId, optionId }) => {
      // A refetch landing now would overwrite the optimistic vote.
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })

      const previous = queryClient.getQueryData<Quack[]>(quackKeys.lists())
      queryClient.setQueryData<Quack[]>(quackKeys.lists(), (quacks) =>
        quacks?.map((quack) =>
          quack.id === quackId && quack.poll
            ? { ...quack, poll: applyVote(quack.poll, optionId) }
            : quack,
        ),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (isLastVoteInFlight() && context?.previous) {
        queryClient.setQueryData(quackKeys.lists(), context.previous)
      }
      toast.error(VOTE_FAILED_MESSAGE)
    },
    onSettled: async () => {
      // Real counts, including other people's votes since the feed loaded.
      if (isLastVoteInFlight()) {
        await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
      }
    },
  })
}
