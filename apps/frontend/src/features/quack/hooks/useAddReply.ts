import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { HTTPError } from "@/lib/api-client"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"

export const REPLY_TO_DELETED_MESSAGE = "That quack was deleted, so you can't reply to it."

export const isReplyToDeletedQuack = (error: unknown): boolean =>
  error instanceof HTTPError && error.response.status === 404

// The hook owns the mutation only — form state belongs to react-hook-form
// in the component, as in useAddQuack.
export function useAddReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addReply,
    onError: (error) => {
      // Someone deleted it while this page was open: say so, and show the
      // thread as it is now. Other errors stay in the form.
      if (isReplyToDeletedQuack(error)) toast.error(REPLY_TO_DELETED_MESSAGE)
    },
    onSettled: async () => {
      // The thread, the feed's reply count and Mine all change.
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
