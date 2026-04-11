"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
            <div className="rounded-full bg-red-100 p-3 text-red-600 mb-4 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-white">Something went wrong!</h2>
            <p className="text-gray-600 mb-6 dark:text-gray-400 max-w-md">
                We apologize for the inconvenience. An unexpected error occurred while loading this page.
            </p>
            <button
                onClick={() => reset()}
                className="rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
                Try again
            </button>
        </div>
    );
}
