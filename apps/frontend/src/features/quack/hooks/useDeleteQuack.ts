import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { applyDelete } from "@/features/quack/lib/applyDelete"

export const DELETE_FAILED_MESSAGE = "Your quack wasn't deleted. Try again."

const deleteMutationKey = ["quacks", "delete"] as const

// The quack leaves the feed, Mine and any open thread as soon as the user
// confirms — or, if it has replies, turns into "This quack was deleted"
// there, as the server will do. The request catches up; if it fails, the
// refetch brings the quack back.
export function useDeleteQuack() {
  const queryClient = useQueryClient()

  // Another delete still on its way? A refetch now could show that quack again.
  const isLastDeleteInFlight = () =>
    queryClient.isMutating({ mutationKey: deleteMutationKey }) === 1

  return useMutation({
    mutationKey: deleteMutationKey,
    mutationFn: deleteQuack,
    onMutate: async ({ quackId }) => {
      // A refetch landing now would put the quack back.
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })
      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (quacks) =>
        quacks ? applyDelete(quacks, quackId) : quacks,
      )
    },
    onError: () => {
      toast.error(DELETE_FAILED_MESSAGE)
    },
    onSettled: async () => {
      if (isLastDeleteInFlight()) {
        await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
      }
    },
  })
}
