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
import { ReplyToDeletedQuack } from "@/features/quack/components/ReplyToDeletedQuack"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"
import { useReplyDraft } from "@/features/quack/hooks/useReplyDraft"
import { useVote } from "@/features/quack/hooks/useVote"
import { filterQuacks } from "@/features/quack/lib/filterQuacks"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
})

type FeedView = "all" | "mine"

function QuacksPage() {
  // Page state only: the search, the tab and an open reply form are gone
  // after a refresh or navigating away.
  const [searchTerm, setSearchTerm] = useState("")
  const [view, setView] = useState<FeedView>("all")
  const reply = useReplyDraft()
  // All: top-level quacks only. Mine: everything the viewer wrote, replies
  // included — the server decides whose from the session.
  const quacksQuery = useQuery(quacksQueryOptions(view))
  // Only for the default mood: until it loads (or if it fails) the forms start without one.
  const profileQuery = useQuery(profileQueryOptions())
  const defaultMood = profileQuery.data?.defaultMood ?? undefined
  // The layout route only renders for a signed-in user, so this is set.
  const { user } = useSession()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const vote = useVote()
  const deleteQuack = useDeleteQuack()

  const quacks = quacksQuery.data ?? []
  // The quack being replied to is gone from the list: it was deleted.
  const isReplyTargetGone =
    reply.replyFormFor !== null &&
    quacksQuery.isSuccess &&
    !quacks.some((quack) => quack.id === reply.replyFormFor)

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          defaultMood={defaultMood}
          textareaRef={textareaRef}
          className="mb-6"
        />

        <Tabs
          value={view}
          onValueChange={(value) => {
            setView(value === "mine" ? "mine" : "all")
            // The other tab lists other quacks: an open form wouldn't find its quack.
            reply.closeReply()
          }}
        >
          <TabsList aria-label="Which quacks to show">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>

          {/* Both tabs show the same list, loaded with a different scope. */}
          <TabsContent value={view}>
            <QuackSearch
              value={searchTerm}
              onChange={setSearchTerm}
              className="mt-2 mb-4"
            />

            {isReplyTargetGone ? (
              <ReplyToDeletedQuack
                draft={reply.replyDraft}
                onDismiss={reply.closeReply}
              />
            ) : null}

            <QuackList
              // The feed is fetched whole (no paging), so filtering stays client-side.
              quacks={filterQuacks(quacks, searchTerm)}
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
              replyFormFor={reply.replyFormFor}
              replyDraft={reply.replyDraft}
              onReplyDraftChange={reply.changeDraft}
              onReplyOpen={reply.openReply}
              onReplyClose={reply.closeReply}
              defaultMood={defaultMood}
            />
          </TabsContent>
        </Tabs>
      </section>
    </>
  )
}
