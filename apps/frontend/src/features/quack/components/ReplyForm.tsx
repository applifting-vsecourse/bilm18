import { useEffect, useId, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { quackMoodSchema, type QuackMood } from "@/features/quack/api/quackSchemas"
import { MoodToggleGroup } from "@/features/quack/components/MoodToggleGroup"
import { isReplyToDeletedQuack, useAddReply } from "@/features/quack/hooks/useAddReply"
import { QUACK_MAX_LENGTH } from "@/features/quack/lib/quackText"

// Same rules as a quack, without a poll — replies have none.
const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(QUACK_MAX_LENGTH, `Keep it under ${QUACK_MAX_LENGTH} characters`),
  mood: quackMoodSchema.optional(),
})

type FormValues = z.infer<typeof schema>

type ReplyFormProps = {
  quackId: string
  // Who the reply answers, for the label.
  authorUsername: string
  // The user's default mood from Settings, pre-selected like for a new quack.
  defaultMood?: QuackMood
  // Called after the reply is posted, on Cancel, and when the quack turns out
  // to be deleted — every way the form is done.
  onClose: () => void
  className?: string
}

export function ReplyForm({
  quackId,
  authorUsername,
  defaultMood,
  onClose,
  className,
}: ReplyFormProps) {
  const addReply = useAddReply()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: defaultMood },
  })

  // The form opens because the user pressed Reply — let them type right away.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    addReply.mutate(
      { quackId, text: values.text, mood: values.mood },
      {
        onSuccess: onClose,
        // The hook already told the user; the refreshed thread shows why.
        onError: (error) => {
          if (isReplyToDeletedQuack(error)) onClose()
        },
      },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addReply.error && !isReplyToDeletedQuack(addReply.error) ? (
          <Alert variant="destructive">
            <AlertDescription>{addReply.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply to @{authorUsername}</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  disabled={addReply.isPending}
                  {...field}
                  ref={(element) => {
                    // react-hook-form needs the element too (it focuses invalid fields).
                    field.ref(element)
                    textareaRef.current = element
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
              <FormLabel id={moodLabelId}>Mood</FormLabel>
              <FormControl>
                <MoodToggleGroup
                  labelledBy={moodLabelId}
                  isDisabled={addReply.isPending}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          <span
            className={cn(
              "text-sm",
              length > QUACK_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{QUACK_MAX_LENGTH}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          {/* The page's one primary button is "Quack"; this one stays quieter. */}
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={addReply.isPending}
          >
            {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reply
          </Button>
        </div>
      </form>
    </Form>
  )
}
