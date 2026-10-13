import { api } from "@/lib/api-client"

import { quackPollSchema, type QuackPoll } from "@/features/quack/api/quackSchemas"

export async function voteInPoll(input: { quackId: string; optionId: string }): Promise<QuackPoll> {
  const json = await api
    .put(`quacks/${input.quackId}/vote`, { json: { optionId: input.optionId } })
    .json()
  return quackPollSchema.parse(json)
}
