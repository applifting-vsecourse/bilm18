import { api } from "@/lib/api-client"

// The server only deletes the signed-in user's own quacks (403 otherwise).
export async function deleteQuack(input: { quackId: string }): Promise<void> {
  await api.delete(`quacks/${input.quackId}`)
}
