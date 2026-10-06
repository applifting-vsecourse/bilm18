import { useId, useRef } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type QuackSearchProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function QuackSearch({ value, onChange, className }: QuackSearchProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  return (
    <div
      role="search"
      className={cn("flex flex-col gap-2", className)}
    >
      <Label htmlFor={inputId}>Search quacks</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          placeholder="e.g. duck or @BreadCritic"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && value !== "") {
              event.preventDefault()
              clear()
            }
          }}
          className={value !== "" ? "pr-12" : undefined}
        />
        {value !== "" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onClick={clear}
            className="absolute inset-y-0 right-1 my-auto"
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
