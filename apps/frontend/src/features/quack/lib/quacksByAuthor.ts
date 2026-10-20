import type { Quack } from "@/features/quack/api/quackSchemas"

// Keeps the quacks `userId` wrote, in feed order.
export function quacksByAuthor(quacks: Quack[], userId: string): Quack[] {
  return quacks.filter((quack) => quack.userId === userId)
}
