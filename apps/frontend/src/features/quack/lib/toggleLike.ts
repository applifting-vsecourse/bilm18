// A quack's likes as the signed-in user sees them (docs/adr/0002).
export type LikeState = {
  likeCount: number
  likedByMe: boolean
}

// What a like or unlike click shows straight away, before the server answers:
// liked becomes unliked and the other way round. The count never drops below 0.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub until likes are implemented
export function toggleLike(state: LikeState): LikeState {
  throw new Error("not implemented")
}
