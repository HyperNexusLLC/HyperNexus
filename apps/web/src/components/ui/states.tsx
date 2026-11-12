import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared loading / error / empty state primitives.
 * Used by segment-level loading.tsx and error.tsx so every dashboard route gets a
 * consistent skeleton, failure, and empty experience instead of ad-hoc inline markup.
 */

export function Spinner({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={cn(
                "h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}

export function LoadingState({
    label = "Loading…",
    className,
}: {
    label?: string
    className?: string
}) {
    return (
        <div
            className={cn(
                "flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 p-6 text-muted-foreground",
                className
            )}
        >
            <Spinner className="h-8 w-8" />
            <p className="text-sm">{label}</p>
            <span className="sr-only">{label}</span>
        </div>
    )
}

export function ErrorState({
    title = "Something went wrong",
    message,
    onRetry,
    retryLabel = "Try again",
    className,
}: {
    title?: string
    message?: string
    onRetry?: () => void
    retryLabel?: string
    className?: string
}) {
    return (
        <div
            role="alert"
            className={cn(
                "flex min-h-[40vh] w-full flex-col items-center justify-center gap-3 p-6 text-center",
                className
            )}
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-lg font-semibold text-destructive">
                !
            </div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {message ? (
                <p className="max-w-md text-sm text-muted-foreground">{message}</p>
            ) : null}
            {onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {retryLabel}
                </button>
            ) : null}
        </div>
    )
}

export function EmptyState({
    title = "Nothing here yet",
    description,
    action,
    className,
}: {
    title?: string
    description?: string
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "flex min-h-[24vh] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center",
                className
            )}
        >
            <h3 className="text-base font-medium text-foreground">{title}</h3>
            {description ? (
                <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
            ) : null}
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    )
}
