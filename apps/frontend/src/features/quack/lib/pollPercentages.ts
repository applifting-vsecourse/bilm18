import type { QuackPoll } from "@/features/quack/api/quackSchemas"

// Whole-number share of the votes for each option, in option order.
// Rounded per option, so the shares don't always add up to exactly 100.
export function pollPercentages(poll: QuackPoll): number[] {
  if (poll.totalVotes === 0) return poll.options.map(() => 0)

  return poll.options.map((option) => Math.round((option.votes / poll.totalVotes) * 100))
}
