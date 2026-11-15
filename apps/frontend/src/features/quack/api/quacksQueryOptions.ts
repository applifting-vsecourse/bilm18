import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema, type QuackScope } from "@/features/quack/api/quackSchemas"

// "all" is the feed (no replies); "mine" is everything the signed-in user
// wrote — the server knows who that is from the session.
export const quacksQueryOptions = (scope: QuackScope = "all") =>
  queryOptions({
    queryKey: quackKeys.list(scope),
    queryFn: async () =>
      quacksSchema.parse(await api.get("quacks", { searchParams: { scope } }).json()),
  })
