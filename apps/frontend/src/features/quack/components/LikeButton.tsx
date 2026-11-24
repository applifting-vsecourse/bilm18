import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LikeButtonProps = {
  likeCount: number
  likedByMe: boolean
  onToggle: () => void
}

// The heart and the count under a quack. Controlled: the click only calls
// onToggle; what liked means comes from the props. "Like" with an outlined
// heart when not liked, "Unlike" with a filled one (aria-pressed) when liked.
// The count is always shown, 0 too.
export function LikeButton(props: LikeButtonProps) {
  const { likeCount, onToggle } = props
  const isLiked = props.likedByMe
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isLiked ? "Unlike" : "Like"}
      aria-pressed={isLiked}
      onClick={onToggle}
    >
      <Heart
        aria-hidden
        className={cn(isLiked && "fill-current")}
      />
      {likeCount}
    </Button>
  )
}
