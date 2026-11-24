import type { ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { LikeButton } from "@/features/quack/components/LikeButton"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { quackMoodLabels } from "@/features/quack/lib/moods"

type QuackItemProps = {
  quack: Quack
  onVote?: (optionId: string) => void
  // Likes or takes back the like (LikeButton). A tombstone has neither the
  // button nor the count.
  onToggleLike?: () => void
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
  onToggleLike,
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
  const live = quack.user && quack.text !== null ? { user: quack.user, text: quack.text } : null
  // Only a live quack loaded with its likes, and only where liking is wired up.
  const likes =
    live && onToggleLike && quack.likeCount !== undefined && quack.likedByMe !== undefined
      ? { likeCount: quack.likeCount, likedByMe: quack.likedByMe }
      : null

  // One tree for both, with `children` always in the same place: when a quack
  // is deleted while its reply form is open, the form keeps what was typed.
  return (
    <article
      id={id}
      className={articleClassName}
    >
      {live ? (
        <Avatar className="size-12">
          <AvatarFallback>{initialsOf(live.user.name)}</AvatarFallback>
        </Avatar>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {replyingTo}
        {live ? (
          <>
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-wrap items-baseline gap-2">
                <span>
                  <UsersName name={live.user.name} />{" "}
                  <UsersUserName username={live.user.username} />
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
                  authorUsername={isOwn ? undefined : live.user.username}
                />
              ) : null}
            </div>
            <p className="text-sm break-words whitespace-pre-line">{live.text}</p>
            {quack.poll ? (
              <QuackPoll
                poll={quack.poll}
                onVote={onVote}
                className="mt-2"
              />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This quack was deleted</p>
        )}
        {/* The like sits in one row with the reply actions; a reply form wraps below. */}
        <div className="flex flex-wrap items-start gap-x-2">
          {likes && onToggleLike ? (
            <div className="mt-1">
              <LikeButton
                likeCount={likes.likeCount}
                likedByMe={likes.likedByMe}
                onToggle={onToggleLike}
              />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </article>
  )
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
