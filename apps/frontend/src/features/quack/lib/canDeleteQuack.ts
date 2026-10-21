import type { Quack } from "@/features/quack/api/quackSchemas"

// Mirrors the server rule: the author, or an admin. Only decides whether to
// offer the action — the server checks again and answers 403 otherwise.
export function canDeleteQuack(quack: Quack, currentUserId?: string, isAdmin = false): boolean {
  if (currentUserId === undefined) return false
  return isAdmin || quack.userId === currentUserId
}
