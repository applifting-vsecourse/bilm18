// A quack's likes as the signed-in user sees them (docs/adr/0002).
export type LikeState = {
  likeCount: number
  likedByMe: boolean
}

// What a like or unlike click shows straight away, before the server answers:
// liked becomes unliked and the other way round. The count never drops below 0.
export function toggleLike(state: LikeState): LikeState {
  return state.likedByMe
    ? { likeCount: Math.max(0, state.likeCount - 1), likedByMe: false }
    : { likeCount: state.likeCount + 1, likedByMe: true }
}
