import type { QuackPoll } from "@/features/quack/api/quackSchemas"

// The poll as it will look once the vote goes through — what the UI shows
// while the request is still on its way. Takes a vote off the old option (if
// any) and adds it to the new one; the same option again changes nothing.
export function applyVote(poll: QuackPoll, optionId: string): QuackPoll {
  const previous = poll.myVoteOptionId
  if (previous === optionId) return poll

  return {
    options: poll.options.map((option) => {
      if (option.id === optionId) return { ...option, votes: option.votes + 1 }
      if (option.id === previous) return { ...option, votes: option.votes - 1 }
      return option
    }),
    totalVotes: previous === null ? poll.totalVotes + 1 : poll.totalVotes,
    myVoteOptionId: optionId,
  }
}
