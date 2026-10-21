import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { canDeleteQuack } from "@/features/quack/lib/canDeleteQuack"

type QuackListProps = {
  quacks: Quack[]
  isLoading?: boolean
  error?: Error
  onReload?: () => void
  // The active search, if any — `quacks` is expected to be filtered already.
  searchTerm?: string
  onVote?: (quackId: string, optionId: string) => void
  // Quacks by this user get a delete action; everyone else's don't…
  currentUserId?: string
  // …unless the viewer is an admin: then every quack gets one.
  isAdmin?: boolean
  onDelete?: (quackId: string) => void
  // "mine" when `quacks` holds only the viewer's own quacks.
  view?: "all" | "mine"
  // Offered when the viewer has no quacks of their own yet.
  onWriteFirst?: () => void
}

export function QuackList({
  quacks,
  isLoading,
  error,
  onReload,
  searchTerm = "",
  onVote,
  currentUserId,
  isAdmin = false,
  onDelete,
  view = "all",
  onWriteFirst,
}: QuackListProps) {
  const trimmedSearchTerm = searchTerm.trim()

  return (
    <div className="flex flex-col">
      {isLoading && quacks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>Couldn&apos;t load quacks</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {onReload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && quacks.length === 0 ? (
        trimmedSearchTerm === "" && view === "mine" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your quacks will appear here. You haven&apos;t posted any yet.
            </p>
            {onWriteFirst ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onWriteFirst}
              >
                Write your first quack
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {trimmedSearchTerm !== ""
              ? `No quacks match "${trimmedSearchTerm}".`
              : "No quacks yet. Post the first one."}
          </p>
        )
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
          onVote={onVote ? (optionId) => onVote(quack.id, optionId) : undefined}
          onDelete={
            onDelete && canDeleteQuack(quack, currentUserId, isAdmin)
              ? () => onDelete(quack.id)
              : undefined
          }
          isOwn={quack.userId === currentUserId}
        />
      ))}
    </div>
  )
}
