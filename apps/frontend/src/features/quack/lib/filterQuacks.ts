import type { Quack } from "@/features/quack/api/quackSchemas"

// Trimmed, case-folded phrase to look for. A leading "@" is dropped because
// usernames are displayed with one in the UI.
export function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/^@/, "").toLowerCase()
}

// Keeps quacks whose text, author name or username contains the term as one
// contiguous phrase. Feed order is preserved; an empty term keeps everything.
export function filterQuacks(quacks: Quack[], term: string): Quack[] {
  const needle = normalizeSearchTerm(term)
  if (needle === "") return quacks

  return quacks.filter((quack) =>
    [quack.text, quack.user.name, quack.user.username].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  )
}
