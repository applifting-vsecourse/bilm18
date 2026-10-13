import { z } from "zod"

// Mirrors the backend's QUACK_MOODS. Features can't import from each other,
// so this is a copy of the list in features/quack — keep the two in step.
export const profileMoods = ["happy", "sad", "angry", "silly"] as const

export const profileMoodSchema = z.enum(profileMoods)

export const profileSchema = z.object({
  username: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  // null means new quacks start without a mood.
  defaultMood: profileMoodSchema.nullable(),
})

export type Profile = z.infer<typeof profileSchema>
export type ProfileMood = z.infer<typeof profileMoodSchema>
