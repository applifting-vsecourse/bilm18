import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// The whole thread `quackId` belongs to, flat and oldest first — the
// top-level quack or any reply in it works. 404 when it doesn't exist.
export const threadQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.thread(quackId),
    queryFn: async () => quacksSchema.parse(await api.get(`quacks/${quackId}/thread`).json()),
  })
