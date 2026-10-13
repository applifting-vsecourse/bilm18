import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfileForm } from "@/features/profile/components/ProfileForm"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const profileQuery = useQuery(profileQueryOptions())

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

        {profileQuery.isPending ? (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              {profileQuery.error.message}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void profileQuery.refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          // The form takes the profile once; a background refetch won't
          // overwrite what the user is in the middle of typing.
          <ProfileForm profile={profileQuery.data} />
        )}
      </section>
    </>
  )
}
