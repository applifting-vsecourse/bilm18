import { Link } from "@tanstack/react-router"
import { CornerDownRight } from "lucide-react"

import { ROUTES } from "@/app/routes"

type ReplyingToProps = {
  // null when the quack replied to was deleted.
  username: string | null
  // Makes the line a link to this reply in its thread (from Mine).
  thread?: { rootId: string; quackId: string }
}

// "↪ Replying to @BreadCritic" above a reply, where the layout doesn't show
// what it answers.
export function ReplyingTo({ username, thread }: ReplyingToProps) {
  const label = username === null ? "Replying to a deleted quack" : `Replying to @${username}`
  const content = (
    <>
      <CornerDownRight
        className="size-3"
        aria-hidden
      />
      {label}
    </>
  )

  return thread ? (
    <Link
      to={ROUTES.thread}
      params={{ quackId: thread.rootId }}
      hash={thread.quackId}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
    >
      {content}
    </Link>
  ) : (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">{content}</p>
  )
}
