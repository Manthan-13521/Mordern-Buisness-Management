import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-white dark:bg-[#020617]">
            <div className="rounded-full bg-gray-100 p-4 text-gray-500 mb-6 dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-gray-400">
                <SearchX className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3 dark:text-white">Page Not Found</h1>
            <p className="text-gray-600 mb-8 dark:text-gray-400 max-w-sm">
                Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <Link
                href="/"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all"
            >
                Go back to Homepage
            </Link>
        </div>
    );
}
