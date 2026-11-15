import { useState } from "react"

import type { QuackMood } from "@/features/quack/api/quackSchemas"

export type ReplyDraft = { text: string; mood?: QuackMood }

type OpenReply = { quackId: string; draft?: ReplyDraft }

// Which quack has its reply form open, and what has been typed in it. Lives
// in the page, not in the form: when the quack is deleted the form goes with
// it, and the draft must still be there to show.
export function useReplyDraft() {
  const [open, setOpen] = useState<OpenReply | null>(null)

  return {
    replyFormFor: open?.quackId ?? null,
    replyDraft: open?.draft,
    openReply: (quackId: string) =>
      setOpen((current) => (current?.quackId === quackId ? current : { quackId })),
    closeReply: () => setOpen(null),
    changeDraft: (draft: ReplyDraft) =>
      setOpen((current) => (current ? { ...current, draft } : current)),
  }
}
