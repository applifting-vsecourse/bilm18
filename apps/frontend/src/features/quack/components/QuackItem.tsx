import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { quackMoodLabels } from "@/features/quack/lib/moods"

type QuackItemProps = {
  quack: Quack
  onVote?: (optionId: string) => void
  // Pass only when the viewer may delete this quack — without it there is no delete action.
  onDelete?: () => void
  // False when an admin deletes someone else's quack: the confirmation then names the author.
  isOwn?: boolean
  // Above the text: who this reply answers (see ReplyingTo).
  replyingTo?: ReactNode
  // Under the text: reply actions, the reply form.
  children?: ReactNode
  // The thread page scrolls to a quack by its element id and highlights it.
  id?: string
  isHighlighted?: boolean
}

export function QuackItem({
  quack,
  onVote,
  onDelete,
  isOwn = true,
  replyingTo,
  children,
  id,
  isHighlighted = false,
}: QuackItemProps) {
  const articleClassName = cn(
    "flex w-full gap-4 border-b border-border pt-2 pb-4 transition-colors last:border-b-0",
    isHighlighted && "rounded-md bg-accent",
  )

  // Deleted while it had replies: it keeps its place in the thread and
  // nothing else — no author, time, mood or actions.
  if (!quack.user || quack.text === null) {
    return (
      <article
        id={id}
        className={articleClassName}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {replyingTo}
          <p className="text-sm text-muted-foreground">This quack was deleted</p>
          {children}
        </div>
      </article>
    )
  }

  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      id={id}
      className={articleClassName}
    >
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {replyingTo}
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-wrap items-baseline gap-2">
            <span>
              <UsersName name={name} /> <UsersUserName username={username} />
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
            {quack.mood ? (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  <span className="sr-only">Mood: </span>
                  {quackMoodLabels[quack.mood]}
                </span>
              </>
            ) : null}
          </div>
          {onDelete ? (
            <DeleteQuackButton
              onDelete={onDelete}
              authorUsername={isOwn ? undefined : username}
            />
          ) : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        {quack.poll ? (
          <QuackPoll
            poll={quack.poll}
            onVote={onVote}
            className="mt-2"
          />
        ) : null}
        {children}
      </div>
    </article>
  )
}
