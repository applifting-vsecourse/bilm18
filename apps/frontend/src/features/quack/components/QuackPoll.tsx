import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { pollPercentages } from "@/features/quack/lib/pollPercentages"

type QuackPollProps = {
  poll: QuackPollData
  // Without it the poll is read-only.
  onVote?: (optionId: string) => void
  className?: string
}

export function QuackPoll({ poll, onVote, className }: QuackPollProps) {
  const percentages = pollPercentages(poll)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul className="flex flex-col gap-2">
        {poll.options.map((option, index) => {
          const isMine = option.id === poll.myVoteOptionId
          const percentage = percentages[index]

          return (
            <li key={option.id}>
              <Button
                type="button"
                variant="outline"
                aria-pressed={isMine}
                disabled={!onVote}
                // Clicking your own vote again does nothing — a vote can be
                // moved, not taken back.
                onClick={() => {
                  if (!isMine) onVote?.(option.id)
                }}
                className="relative h-auto w-full justify-between overflow-hidden px-3 py-2 font-normal"
              >
                {/* The bar's width is data, so it can't come from the spacing scale. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-muted"
                  style={{ width: `${percentage}%` }}
                />
                <span className={cn("relative flex items-center gap-2", isMine && "font-medium")}>
                  {option.text}
                  {isMine ? (
                    <Check
                      aria-hidden
                      className="size-4"
                    />
                  ) : null}
                </span>
                <span className="relative text-muted-foreground tabular-nums">
                  {option.votes} · {percentage}%
                </span>
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
      </p>
    </div>
  )
}
