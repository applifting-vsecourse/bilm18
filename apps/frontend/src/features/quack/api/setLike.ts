import type { LikeState } from "@/features/quack/lib/toggleLike"

// Likes (`liked: true`, PUT) or takes back the like (`liked: false`, DELETE)
// of `quackId` as the signed-in user; returns the quack's likes as they now are.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub until likes are implemented
export function setLike(input: { quackId: string; liked: boolean }): Promise<LikeState> {
  throw new Error("not implemented")
}
