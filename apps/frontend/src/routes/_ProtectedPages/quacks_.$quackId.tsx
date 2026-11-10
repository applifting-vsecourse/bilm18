import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { useSession } from "@/features/auth/hooks/useSession"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { threadQueryOptions } from "@/features/quack/api/threadQueryOptions"
import { QuackThread, threadQuackElementId } from "@/features/quack/components/QuackThread"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"
import { useVote } from "@/features/quack/hooks/useVote"
import { buildThreadTree } from "@/features/quack/lib/buildThreadTree"

export const Route = createFileRoute("/_ProtectedPages/quacks_/$quackId")({
  component: ThreadPage,
})

// How long a linked-to quack stays highlighted.
const HIGHLIGHT_MS = 2000

function ThreadPage() {
  const { quackId } = Route.useParams()
  // "#<replyId>" from Mine; without it, a reply's own id in the URL.
  const hash = useLocation({ select: (location) => location.hash })
  const threadQuery = useQuery(threadQueryOptions(quackId))
  const profileQuery = useQuery(profileQueryOptions())
  const { user } = useSession()
  // Page state only.
  const [replyFormFor, setReplyFormFor] = useState<string | null>(null)
  // The linked-to quack is highlighted until its highlight has run out.
  const [expiredHighlightId, setExpiredHighlightId] = useState<string | undefined>()
  const vote = useVote()
  const deleteQuack = useDeleteQuack()

  const tree = useMemo(
    () => (threadQuery.data ? buildThreadTree(threadQuery.data) : null),
    [threadQuery.data],
  )
  const targetId = hash || (tree && tree.quack.id !== quackId ? quackId : undefined)
  const hasTree = tree !== null
  const highlightedId = targetId !== expiredHighlightId ? targetId : undefined

  // Once the thread is on screen, bring the linked-to quack into view.
  useEffect(() => {
    if (!hasTree || !targetId) return
    document
      .getElementById(threadQuackElementId(targetId))
      ?.scrollIntoView({ block: "center", behavior: "smooth" })
    const timeout = setTimeout(() => setExpiredHighlightId(targetId), HIGHLIGHT_MS)
    return () => clearTimeout(timeout)
  }, [hasTree, targetId])

  const isNotFound =
    threadQuery.error instanceof HTTPError && threadQuery.error.response.status === 404

  return (
    <>
      <Seo title="Thread" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-4"
        >
          <Link to={ROUTES.quacks}>
            <ArrowLeft />
            Back to quacks
          </Link>
        </Button>

        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Thread</h1>

        {threadQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}

        {isNotFound || (threadQuery.isSuccess && !tree) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This quack doesn&apos;t exist. It may have been deleted.
          </p>
        ) : null}

        {threadQuery.error && !isNotFound ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load the thread</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{threadQuery.error.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void threadQuery.refetch()}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {tree ? (
          <QuackThread
            tree={tree}
            highlightedId={highlightedId}
            onVote={(id, optionId) => vote.mutate({ quackId: id, optionId })}
            currentUserId={user?.id}
            // Only shows the action; the server decides who may delete.
            isAdmin={user?.role === "admin"}
            onDelete={(id) => deleteQuack.mutate({ quackId: id })}
            replyFormFor={replyFormFor}
            onReplyOpen={setReplyFormFor}
            onReplyClose={() => setReplyFormFor(null)}
            defaultMood={profileQuery.data?.defaultMood ?? undefined}
          />
        ) : null}
      </section>
    </>
  )
}
