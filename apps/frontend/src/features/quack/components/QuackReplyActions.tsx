import { Link } from "@tanstack/react-router"
import { MessageCircle, Reply } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { isTombstone } from "@/features/quack/lib/isTombstone"

type QuackReplyActionsProps = {
  quack: Quack
  // Without it there is no Reply button.
  onReply?: () => void
  // Off on the thread page, which already shows the replies.
  shouldShowThreadLink?: boolean
}

// Under a quack: Reply, and for a top-level quack with replies the way into
// its thread with how many there are. Nothing for a deleted quack except
// the thread link — nobody can reply to it.
export function QuackReplyActions({
  quack,
  onReply,
  shouldShowThreadLink = true,
}: QuackReplyActionsProps) {
  const canReply = onReply !== undefined && !isTombstone(quack)
  const hasThreadLink = shouldShowThreadLink && quack.parentId === null && quack.replyCount > 0
  if (!canReply && !hasThreadLink) return null

  const replies = quack.replyCount === 1 ? "1 reply" : `${quack.replyCount} replies`

  return (
    <div className="mt-1 flex items-center gap-2">
      {canReply ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReply}
        >
          <Reply />
          Reply
        </Button>
      ) : null}
      {hasThreadLink ? (
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link
            to={ROUTES.thread}
            params={{ quackId: quack.id }}
            aria-label={`${replies} — open thread`}
          >
            <MessageCircle />
            {quack.replyCount}
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
