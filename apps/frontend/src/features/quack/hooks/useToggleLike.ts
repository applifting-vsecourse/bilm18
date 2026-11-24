import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { setLike } from "@/features/quack/api/setLike"
import { toggleLike, type LikeState } from "@/features/quack/lib/toggleLike"

export const LIKE_FAILED_MESSAGE = "Your like didn't go through. Try again."

const likeMutationKey = ["quacks", "like"] as const

// Liking feels instant: every list and thread shows the new like straight
// away and the request catches up. If it fails, they go back to how they were
// and a toast says so. Either way the quacks reload afterwards. Same pattern
// as useVote.
export function useToggleLike(): UseMutationResult<
  LikeState,
  Error,
  { quackId: string; liked: boolean }
> {
  const queryClient = useQueryClient()

  // Another like still on its way? Then the lists already show that one, and
  // restoring or refetching now would wipe it.
  const isLastLikeInFlight = () => queryClient.isMutating({ mutationKey: likeMutationKey }) === 1

  return useMutation({
    mutationKey: likeMutationKey,
    mutationFn: setLike,
    // Likes reach the server one at a time, in click order, so the last
    // click is the one that sticks.
    scope: { id: "quack-like" },
    onMutate: async ({ quackId, liked: isLiked }) => {
      // A refetch landing now would overwrite the optimistic like.
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })

      // The quack can be in the feed, in Mine and in an open thread at once.
      const previous = queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.all() })
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (quacks) =>
        quacks?.map((quack) =>
          quack.id === quackId &&
          quack.likeCount !== undefined &&
          quack.likedByMe !== undefined &&
          // Already as asked: nothing to show.
          quack.likedByMe !== isLiked
            ? {
                ...quack,
                ...toggleLike({ likeCount: quack.likeCount, likedByMe: quack.likedByMe }),
              }
            : quack,
        ),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (isLastLikeInFlight() && context?.previous) {
        for (const [queryKey, quacks] of context.previous) {
          queryClient.setQueryData(queryKey, quacks)
        }
      }
      toast.error(LIKE_FAILED_MESSAGE)
    },
    onSettled: async () => {
      // Real counts, including other people's likes since the list loaded,
      // and a quack deleted in the meantime as a tombstone (or gone).
      if (isLastLikeInFlight()) {
        await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
      }
    },
  })
}
