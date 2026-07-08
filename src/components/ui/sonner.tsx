"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--border-radius": "var(--radius-2xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          // Layout only — no color here, so per-type classes below always win.
          toast:
            "cn-toast flex items-center gap-3 w-full rounded-2xl border px-4 py-3.5 shadow-premium backdrop-blur-sm",
          title: "text-sm font-bold text-foreground leading-tight",
          description: "text-xs text-muted-foreground mt-0.5 leading-snug",
          icon: "flex size-8 shrink-0 items-center justify-center rounded-full mt-0.5 [&_svg]:size-4",
          closeButton:
            "!bg-transparent !border-none !text-muted-foreground hover:!text-foreground !px-2 !py-1",
          actionButton: "!bg-primary !text-primary-foreground !rounded-lg !text-xs !font-bold !px-2 !py-1",
          cancelButton: "!bg-muted !text-muted-foreground !rounded-lg !text-xs !font-semibold !px-2 !py-1",
          // Every routine confirmation (cart, saved address, location…) rides on the
          // app's own teal identity instead of a generic green "success" pill.
          default: "border-border bg-card [&_[data-icon]]:bg-muted [&_[data-icon]]:text-muted-foreground",
          loading: "border-border bg-card [&_[data-icon]]:bg-muted [&_[data-icon]]:text-muted-foreground",
          success: "border-primary/20 bg-primary/8 [&_[data-icon]]:bg-primary/15 [&_[data-icon]]:text-primary",
          info: "border-primary/20 bg-primary/8 [&_[data-icon]]:bg-primary/15 [&_[data-icon]]:text-primary",
          warning: "border-warning/25 bg-warning/10 [&_[data-icon]]:bg-warning/20 [&_[data-icon]]:text-warning",
          error: "border-destructive/20 bg-destructive/8 [&_[data-icon]]:bg-destructive/15 [&_[data-icon]]:text-destructive",
          content: "flex-1",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
