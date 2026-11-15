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
import {
  isReplyToDeletedQuack,
  REPLY_TO_DELETED_MESSAGE,
  useAddReply,
} from "@/features/quack/hooks/useAddReply"
import type { ReplyDraft } from "@/features/quack/hooks/useReplyDraft"
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
  // Who the reply answers, for the label. null once that quack was deleted.
  authorUsername: string | null
  // The user's default mood from Settings, pre-selected like for a new quack.
  defaultMood?: QuackMood
  // What was typed before this form was (re)mounted, and where to report
  // changes — the page keeps it in case the quack is deleted under the form.
  draft?: ReplyDraft
  onDraftChange?: (draft: ReplyDraft) => void
  // Called after the reply is posted and on Cancel. Not when the quack turns
  // out to be deleted: the form stays, so what was typed isn't lost.
  onClose: () => void
  className?: string
}

export function ReplyForm({
  quackId,
  authorUsername,
  defaultMood,
  draft,
  onDraftChange,
  onClose,
  className,
}: ReplyFormProps) {
  const addReply = useAddReply()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: draft?.text ?? "", mood: draft ? draft.mood : defaultMood },
  })

  // The form opens because the user pressed Reply — let them type right away.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const text = useWatch({ control: form.control, name: "text" })
  const mood = useWatch({ control: form.control, name: "mood" })
  const length = text?.length ?? 0

  useEffect(() => {
    onDraftChange?.({ text: text ?? "", mood })
    // Report typing only; a new callback identity is no reason to report again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, mood])

  // The server said 404: nobody can reply to this quack any more.
  const isQuackDeleted = isReplyToDeletedQuack(addReply.error)

  const handleSubmit = (values: FormValues) => {
    addReply.mutate(
      { quackId, text: values.text, mood: values.mood },
      {
        onSuccess: onClose,
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
        {addReply.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {isQuackDeleted ? REPLY_TO_DELETED_MESSAGE : addReply.error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {authorUsername ? `Reply to @${authorUsername}` : "Reply to a deleted quack"}
              </FormLabel>
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
            disabled={addReply.isPending || isQuackDeleted}
          >
            {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reply
          </Button>
        </div>
      </form>
    </Form>
  )
}
