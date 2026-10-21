import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"
import { useVote } from "@/features/quack/hooks/useVote"
import { filterQuacks } from "@/features/quack/lib/filterQuacks"
import { quacksByAuthor } from "@/features/quack/lib/quacksByAuthor"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
})

type FeedView = "all" | "mine"

function QuacksPage() {
  const quacksQuery = useQuery(quacksQueryOptions())
  // Only for the default mood: until it loads (or if it fails) the form starts without one.
  const profileQuery = useQuery(profileQueryOptions())
  // The layout route only renders for a signed-in user, so this is set.
  const { user } = useSession()
  // Page state only: the search and the tab are gone after a refresh or navigating away.
  const [searchTerm, setSearchTerm] = useState("")
  const [view, setView] = useState<FeedView>("all")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const vote = useVote()
  const deleteQuack = useDeleteQuack()

  const quacks = quacksQuery.data ?? []
  const visibleQuacks = view === "mine" && user ? quacksByAuthor(quacks, user.id) : quacks

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={profileQuery.data?.defaultMood ?? undefined}
          textareaRef={textareaRef}
          className="mb-6"
        />

        <Tabs
          value={view}
          onValueChange={(value) => setView(value === "mine" ? "mine" : "all")}
        >
          <TabsList aria-label="Which quacks to show">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>

          {/* Both tabs show the same list, filtered differently. */}
          <TabsContent value={view}>
            <QuackSearch
              value={searchTerm}
              onChange={setSearchTerm}
              className="mt-2 mb-4"
            />

            <QuackList
              // The feed is fetched whole (no paging), so filtering stays client-side.
              quacks={filterQuacks(visibleQuacks, searchTerm)}
              searchTerm={searchTerm}
              view={view}
              isLoading={quacksQuery.isLoading}
              error={quacksQuery.error ?? undefined}
              // Only the error state offers a retry — posting invalidates the list,
              // and refocusing the tab refetches it.
              onReload={() => void quacksQuery.refetch()}
              onVote={(quackId, optionId) => vote.mutate({ quackId, optionId })}
              currentUserId={user?.id}
              // Only shows the action; the server decides who may delete.
              isAdmin={user?.role === "admin"}
              onDelete={(quackId) => deleteQuack.mutate({ quackId })}
              onWriteFirst={() => textareaRef.current?.focus()}
            />
          </TabsContent>
        </Tabs>
      </section>
    </>
  )
}
