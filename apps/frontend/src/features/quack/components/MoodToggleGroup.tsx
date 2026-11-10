import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { quackMoods, quackMoodSchema, type QuackMood } from "@/features/quack/api/quackSchemas"
import { quackMoodLabels } from "@/features/quack/lib/moods"

type MoodToggleGroupProps = {
  value: QuackMood | undefined
  onChange: (mood: QuackMood | undefined) => void
  // A toggle group is a div, which `htmlFor` can't label — name it via aria-labelledby.
  labelledBy: string
  isDisabled?: boolean
}

// One mood or none, for a new quack or a reply.
export function MoodToggleGroup({ value, onChange, labelledBy, isDisabled }: MoodToggleGroupProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-labelledby={labelledBy}
      disabled={isDisabled}
      value={value ?? ""}
      // Pressing the active mood again unpresses it: "" means no mood.
      onValueChange={(mood) => onChange(mood === "" ? undefined : quackMoodSchema.parse(mood))}
    >
      {quackMoods.map((mood) => (
        <ToggleGroupItem
          key={mood}
          value={mood}
        >
          {quackMoodLabels[mood]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
