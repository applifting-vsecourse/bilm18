import type { Quack } from "@/features/quack/api/quackSchemas"
import { isTombstone } from "@/features/quack/lib/isTombstone"

// Mirrors the server rule: the author, or an admin — and never a quack that
// is already deleted. Only decides whether to offer the action; the server
// checks again and answers 403 (or 404) otherwise.
export function canDeleteQuack(quack: Quack, currentUserId?: string, isAdmin = false): boolean {
  if (currentUserId === undefined || isTombstone(quack)) return false
  return isAdmin || quack.userId === currentUserId
}
