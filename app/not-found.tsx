import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
            <div className="rounded-full bg-gray-100 p-4 text-gray-500 mb-6 dark:bg-gray-800 dark:text-gray-400">
                <SearchX className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3 dark:text-white">Page Not Found</h2>
            <p className="text-gray-600 mb-8 dark:text-gray-400 max-w-sm">
                Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <Link
                href="/admin/dashboard"
                className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
                Go back to Dashboard
            </Link>
        </div>
    );
}
