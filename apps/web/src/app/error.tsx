"use client"

import { ErrorState } from "@/components/ui/states"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <ErrorState
            title="Something went wrong"
            message={error?.message || "An unexpected error occurred while rendering this page."}
            onRetry={reset}
        />
    )
}
