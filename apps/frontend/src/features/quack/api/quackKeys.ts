import type { QuackScope } from "@/features/quack/api/quackSchemas"

// Every query under `all()` holds a Quack[] — the lists and the threads —
// so a vote or a delete can update them all the same way.
export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (scope: QuackScope) => [...quackKeys.lists(), scope] as const,
  threads: () => [...quackKeys.all(), "thread"] as const,
  thread: (quackId: string) => [...quackKeys.threads(), quackId] as const,
}
