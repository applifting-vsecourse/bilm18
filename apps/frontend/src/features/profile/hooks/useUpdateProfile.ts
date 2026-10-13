import { useMutation, useQueryClient } from "@tanstack/react-query"

import { updateProfile } from "@/features/profile/api/updateProfile"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      // The name and @username show up in the header (session), on every
      // quack in the feed and here — refresh everything so they change at once.
      await queryClient.invalidateQueries()
    },
  })
}
