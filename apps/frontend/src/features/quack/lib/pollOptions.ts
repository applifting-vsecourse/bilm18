// Mirror the server-side DTO so the user is told before the request is made —
// the server still validates independently.
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 7
export const POLL_OPTION_MAX_LENGTH = 50

// Positions of options that repeat an earlier one, ignoring case and the
// spaces around them: ["Pizza", "Sushi", " pizza "] → [2]. The first
// occurrence counts as the original.
export function findDuplicateOptions(options: string[]): number[] {
  const seen = new Set<string>()
  const duplicates: number[] = []

  options.forEach((option, index) => {
    const key = option.trim().toLowerCase()
    // Empty options have their own message; don't call them duplicates too.
    if (key === "") return
    if (seen.has(key)) duplicates.push(index)
    else seen.add(key)
  })

  return duplicates
}
