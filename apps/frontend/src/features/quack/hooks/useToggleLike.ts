import type { UseMutationResult } from "@tanstack/react-query"

import type { LikeState } from "@/features/quack/lib/toggleLike"

export const LIKE_FAILED_MESSAGE = "Your like didn't go through. Try again."

// Liking feels instant: every list and thread shows the new like straight
// away and the request catches up. If it fails, they go back to how they were
// and a toast says so. Either way the quacks reload afterwards. Same pattern
// as useVote.
export function useToggleLike(): UseMutationResult<
  LikeState,
  Error,
  { quackId: string; liked: boolean }
> {
  throw new Error("not implemented")
}
