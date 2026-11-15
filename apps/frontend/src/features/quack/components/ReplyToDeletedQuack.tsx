import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { REPLY_TO_DELETED_MESSAGE } from "@/features/quack/hooks/useAddReply"
import type { ReplyDraft } from "@/features/quack/hooks/useReplyDraft"

type ReplyToDeletedQuackProps = {
  draft?: ReplyDraft
  onDismiss: () => void
}

// Shown in place of a reply form whose quack is gone. What was typed stays
// here to copy — it was never sent, so nothing else holds it.
export function ReplyToDeletedQuack({ draft, onDismiss }: ReplyToDeletedQuackProps) {
  return (
    <div className="mb-4 space-y-3">
      <Alert variant="destructive">
        <AlertDescription>{REPLY_TO_DELETED_MESSAGE}</AlertDescription>
      </Alert>
      {draft?.text ? (
        <Textarea
          aria-label="Your unsent reply"
          readOnly
          rows={2}
          value={draft.text}
        />
      ) : null}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
