import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { HTTPError } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  profileMoods,
  profileMoodSchema,
  type Profile,
} from "@/features/profile/api/profileSchemas"
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile"
import { profileMoodLabels } from "@/features/profile/lib/moods"

// Mirrors the server-side DTO, so the user is told before the request is
// made — the server still validates independently.
const BIO_MAX_LENGTH = 160

// The toggle group can't hold null, so "no default mood" gets its own value.
const NO_MOOD = "none"

const schema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.]{3,30}$/, "Use 3–30 characters: letters, numbers, dots and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Keep it under ${BIO_MAX_LENGTH} characters`),
  defaultMood: profileMoodSchema.nullable(),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (profile: Profile): FormValues => ({
  username: profile.username,
  name: profile.name,
  bio: profile.bio ?? "",
  defaultMood: profile.defaultMood,
})

type ProfileFormProps = {
  profile: Profile
  className?: string
}

export function ProfileForm({ profile, className }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0

  const handleSubmit = (values: FormValues) => {
    updateProfile.mutate(
      { ...values, bio: values.bio === "" ? null : values.bio },
      {
        onSuccess: (saved) => {
          // The saved values become what "Discard changes" goes back to.
          form.reset(toFormValues(saved))
          toast.success("Profile saved")
        },
        onError: (error) => {
          // Shown under the field; what the user typed stays in it.
          if (error instanceof HTTPError && error.response.status === 409) {
            form.setError(
              "username",
              { message: `@${values.username} is already taken. Try a different username.` },
              { shouldFocus: true },
            )
          }
        },
      },
    )
  }

  // A taken username is reported on the field itself, not in the banner.
  const bannerError =
    updateProfile.error &&
    !(updateProfile.error instanceof HTTPError && updateProfile.error.response.status === 409)
      ? updateProfile.error
      : null

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-6", className)}
      >
        {bannerError ? (
          <Alert variant="destructive">
            <AlertDescription>{bannerError.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                People find you as @{field.value || "username"}. 3–30 letters, numbers, dots or
                underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Professional bread critic. Amateur swan diplomat."
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-3">
                <FormMessage />
                <span
                  className={cn(
                    "ml-auto text-sm",
                    bioLength > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX_LENGTH}
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              {/* A toggle group is a div, which `htmlFor` can't label — name it via aria-labelledby. */}
              <FormLabel id={moodLabelId}>Default mood for new quacks</FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-labelledby={moodLabelId}
                  disabled={updateProfile.isPending}
                  value={field.value ?? NO_MOOD}
                  // "" means the active item was pressed again — keep the choice;
                  // "None" is how you clear it.
                  onValueChange={(value) => {
                    if (value === "") return
                    field.onChange(value === NO_MOOD ? null : profileMoodSchema.parse(value))
                  }}
                >
                  <ToggleGroupItem value={NO_MOOD}>None</ToggleGroupItem>
                  {profileMoods.map((mood) => (
                    <ToggleGroupItem
                      key={mood}
                      value={mood}
                    >
                      {profileMoodLabels[mood]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || updateProfile.isPending}
            onClick={() => {
              form.reset()
              updateProfile.reset()
            }}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
