"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

export function Topbar() {
    const { data: session } = useSession();

    return (
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-slate-950/20 backdrop-blur-md px-4 shadow-sm sm:px-6 lg:px-8 bg-background">
            <div className="flex flex-1">
                {/* Mobile menu button could go here */}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <div className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                        <span className="sr-only">Your profile</span>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center text-white">
                            <UserIcon className="h-5 w-5" />
                        </div>
                        <span aria-hidden="true">
                            {session?.user?.role === "admin" || session?.user?.role === "superadmin"
                                ? `${session?.user?.poolName || "Pool"} (Admin)`
                                : `${session?.user?.name || "User"} (${session?.user?.role})`}
                        </span>
                    </div>

                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-2 rounded-md bg-transparent px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
