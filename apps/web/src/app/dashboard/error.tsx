"use client"

import { ErrorState } from "@/components/ui/states"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <ErrorState
            title="Dashboard failed to load"
            message={error?.message || "This dashboard section hit an unexpected error."}
            onRetry={reset}
        />
    )
}
