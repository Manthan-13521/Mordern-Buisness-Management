"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type PoolMemberType = "all" | "member" | "entertainment";

interface PoolTypeContextProps {
    selectedType: PoolMemberType;
    setSelectedType: (type: PoolMemberType) => void;
}

const PoolTypeContext = createContext<PoolTypeContextProps | undefined>(undefined);

export function PoolTypeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedType, setSelectedType] = useState<PoolMemberType>("all");

    // Initialize from URL or localStorage
    useEffect(() => {
        const urlType = searchParams.get("type") as PoolMemberType;
        if (urlType === "all" || urlType === "member" || urlType === "entertainment") {
            setSelectedType(urlType);
            localStorage.setItem("poolMemberType", urlType);
        } else {
            const saved = localStorage.getItem("poolMemberType") as PoolMemberType;
            if (saved === "all" || saved === "member" || saved === "entertainment") {
                setSelectedType(saved);
                // Sync to URL
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set("type", saved);
                router.replace(`${pathname}?${newParams.toString()}`);
            } else {
                setSelectedType("all");
            }
        }
    }, [searchParams, pathname, router]);

    const handleSelectType = (type: PoolMemberType) => {
        setSelectedType(type);
        localStorage.setItem("poolMemberType", type);
        const newParams = new URLSearchParams(searchParams.toString());
        if (type === "all") {
            newParams.delete("type");
        } else {
            newParams.set("type", type);
        }
        router.push(`${pathname}?${newParams.toString()}`);
    };

    return (
        <PoolTypeContext.Provider value={{ selectedType, setSelectedType: handleSelectType }}>
            {children}
        </PoolTypeContext.Provider>
    );
}

export function usePoolType() {
    const context = useContext(PoolTypeContext);
    if (context === undefined) {
        throw new Error("usePoolType must be used within a PoolTypeProvider");
    }
    return context;
}
