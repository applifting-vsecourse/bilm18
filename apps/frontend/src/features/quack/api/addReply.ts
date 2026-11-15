import { api } from "@/lib/api-client"

import { quackSchema, type Quack, type QuackMood } from "@/features/quack/api/quackSchemas"

// 404 when the quack replied to was deleted in the meantime.
export async function addReply(input: {
  quackId: string
  text: string
  mood?: QuackMood
}): Promise<Quack> {
  const { quackId, ...body } = input
  const json = await api.post(`quacks/${quackId}/replies`, { json: body }).json()
  return quackSchema.parse(json)
}
