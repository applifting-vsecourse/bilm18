import { useEffect, useId, type RefObject } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ListChecks, Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import { quackMoods, quackMoodSchema, type QuackMood } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"
import { quackMoodLabels } from "@/features/quack/lib/moods"
import {
  findDuplicateOptions,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
} from "@/features/quack/lib/pollOptions"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
  // Optional: no toggle pressed means no mood.
  mood: quackMoodSchema.optional(),
  // Empty means a plain quack. Objects, not strings: useFieldArray needs them.
  pollOptions: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, "Options can't be empty")
          .max(POLL_OPTION_MAX_LENGTH, `Keep it under ${POLL_OPTION_MAX_LENGTH} characters`),
      }),
    )
    .superRefine((options, ctx) => {
      for (const index of findDuplicateOptions(options.map((option) => option.text))) {
        ctx.addIssue({
          code: "custom",
          message: "This option is already in the poll",
          path: [index, "text"],
        })
      }
    }),
})

type FormValues = z.infer<typeof schema>

type QuackFormProps = {
  // The user's default mood from Settings, pre-selected for every new quack.
  defaultMood?: QuackMood
  // Lets the page focus the text field, e.g. from an empty state.
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  className?: string
}

export function QuackForm({ defaultMood, textareaRef, className }: QuackFormProps) {
  const addQuack = useAddQuack()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: defaultMood, pollOptions: [] },
  })
  const pollOptions = useFieldArray({ control: form.control, name: "pollOptions" })
  const hasPoll = pollOptions.fields.length > 0

  // The default can arrive after the form mounts (the profile loads separately)
  // or change in Settings — follow it unless the user already picked a mood here.
  useEffect(() => {
    if (form.getFieldState("mood").isDirty) return
    form.resetField("mood", { defaultValue: defaultMood })
  }, [defaultMood, form])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood,
        pollOptions:
          values.pollOptions.length > 0
            ? values.pollOptions.map((option) => option.text)
            : undefined,
      },
      { onSuccess: () => form.reset({ text: "", mood: defaultMood, pollOptions: [] }) },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Quack something..."
                  disabled={addQuack.isPending}
                  {...field}
                  ref={(element) => {
                    // react-hook-form needs the element too (it focuses invalid fields).
                    field.ref(element)
                    if (textareaRef) textareaRef.current = element
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mood"
          render={({ field }) => (
            <FormItem>
              {/* A toggle group is a div, which `htmlFor` can't label — name it via aria-labelledby. */}
              <FormLabel id={moodLabelId}>Mood</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-labelledby={moodLabelId}
                  disabled={addQuack.isPending}
                  value={field.value ?? ""}
                  // Pressing the active mood again unpresses it: "" means no mood.
                  onValueChange={(value) =>
                    field.onChange(value === "" ? undefined : quackMoodSchema.parse(value))
                  }
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
              </FormControl>
            </FormItem>
          )}
        />

        {hasPoll ? (
          <fieldset
            className="space-y-3"
            disabled={addQuack.isPending}
          >
            <legend className="mb-3 text-sm font-medium">Poll</legend>

            {pollOptions.fields.map((option, index) => (
              <FormField
                key={option.id}
                control={form.control}
                name={`pollOptions.${index}.text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option {index + 1}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          placeholder={index === 0 ? "e.g. Pizza" : undefined}
                          {...field}
                        />
                      </FormControl>
                      {/* A poll can't drop below two options. */}
                      {pollOptions.fields.length > POLL_MIN_OPTIONS ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove option ${index + 1}`}
                          onClick={() => pollOptions.remove(index)}
                        >
                          <X />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex flex-wrap gap-2">
              {pollOptions.fields.length < POLL_MAX_OPTIONS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pollOptions.append({ text: "" })}
                >
                  <Plus />
                  Add option
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => pollOptions.remove()}
              >
                Remove poll
              </Button>
            </div>
          </fieldset>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={addQuack.isPending}
            onClick={() =>
              pollOptions.append(Array.from({ length: POLL_MIN_OPTIONS }, () => ({ text: "" })))
            }
          >
            <ListChecks />
            Add poll
          </Button>
        )}

        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
