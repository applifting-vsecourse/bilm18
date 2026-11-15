import type { Quack } from "@/features/quack/api/quackSchemas"

// A quack deleted while it had replies (docs/adr/0001): it keeps its place in
// the thread, and nothing else — no text, author, mood or poll.
export function isTombstone(quack: Pick<Quack, "deletedAt">): boolean {
  return quack.deletedAt !== null
}
