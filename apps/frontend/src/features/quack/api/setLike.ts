import { api } from "@/lib/api-client"

import { quackLikesSchema } from "@/features/quack/api/quackSchemas"
import type { LikeState } from "@/features/quack/lib/toggleLike"

// Likes (`liked: true`, PUT) or takes back the like (`liked: false`, DELETE)
// of `quackId` as the signed-in user; returns the quack's likes as they now are.
export async function setLike(input: { quackId: string; liked: boolean }): Promise<LikeState> {
  const url = `quacks/${input.quackId}/like`
  const json = await (input.liked ? api.put(url) : api.delete(url)).json()
  return quackLikesSchema.parse(json)
}
