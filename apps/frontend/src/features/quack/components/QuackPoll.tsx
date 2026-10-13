import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { QuackPoll as QuackPollData } from "@/features/quack/api/quackSchemas"
import { pollPercentages } from "@/features/quack/lib/pollPercentages"

type QuackPollProps = { poll: QuackPollData; className?: string }

export function QuackPoll({ poll, className }: QuackPollProps) {
  const percentages = pollPercentages(poll)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul className="flex flex-col gap-2">
        {poll.options.map((option, index) => {
          const isMine = option.id === poll.myVoteOptionId
          const percentage = percentages[index]

          return (
            <li
              key={option.id}
              className="relative overflow-hidden rounded-md border border-border text-sm"
            >
              {/* The bar's width is data, so it can't come from the spacing scale. */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-muted"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 px-3 py-2">
                <span className={cn("flex items-center gap-2", isMine && "font-medium")}>
                  {option.text}
                  {isMine ? (
                    <>
                      <Check
                        aria-hidden
                        className="size-4"
                      />
                      <span className="sr-only">(your vote)</span>
                    </>
                  ) : null}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {option.votes} · {percentage}%
                </span>
              </div>
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
