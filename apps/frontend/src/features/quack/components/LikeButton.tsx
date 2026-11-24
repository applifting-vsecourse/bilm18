type LikeButtonProps = {
  likeCount: number
  likedByMe: boolean
  onToggle: () => void
}

// The heart and the count under a quack. Controlled: the click only calls
// onToggle; what liked means comes from the props. "Like" with an outlined
// heart when not liked, "Unlike" with a filled one (aria-pressed) when liked.
// The count is always shown, 0 too.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub until likes are implemented
export function LikeButton(props: LikeButtonProps): React.ReactElement {
  throw new Error("not implemented")
}
