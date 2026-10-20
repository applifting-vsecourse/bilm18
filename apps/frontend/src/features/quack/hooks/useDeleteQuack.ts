import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"

export const DELETE_FAILED_MESSAGE = "Your quack wasn't deleted. Try again."

const deleteMutationKey = ["quacks", "delete"] as const

// The quack leaves the feed as soon as the user confirms; the request
// catches up. If it fails, the refetch brings the quack back.
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
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      queryClient.setQueryData<Quack[]>(quackKeys.lists(), (quacks) =>
        quacks?.filter((quack) => quack.id !== quackId),
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
