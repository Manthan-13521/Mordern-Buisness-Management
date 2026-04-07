"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

const LS_KEY = "hostel_block_filter";

interface HostelBlockContextValue {
    selectedBlock: string;
    setSelectedBlock: (block: string) => void;
    blocks: string[];
    blocksLoading: boolean;
}

const HostelBlockContext = createContext<HostelBlockContextValue>({
    selectedBlock: "all",
    setSelectedBlock: () => {},
    blocks: [],
    blocksLoading: false,
});

export function useHostelBlock() {
    return useContext(HostelBlockContext);
}

export function HostelBlockProvider({ children }: { children: ReactNode }) {
    const router       = useRouter();
    const pathname     = usePathname();
    const searchParams = useSearchParams();

    const [blocks, setBlocks]               = useState<string[]>([]);
    const [blocksLoading, setBlocksLoading] = useState(true);

    // Resolve initial selected block securely without breaking SSR hydration.
    // Initialize strictly from URL param or "all". LocalStorage is read later in useEffect.
    const [selectedBlock, _setSelectedBlock] = useState<string>(() => searchParams.get("block") || "all");

    // Fetch block list once on mount
    useEffect(() => {
        setBlocksLoading(true);

        // Client-side initialization: if no URL param exists, attempt to restore from localStorage.
        let resolvedBlock = searchParams.get("block");
        if (!resolvedBlock) {
            try {
                const fromStorage = localStorage.getItem(LS_KEY);
                if (fromStorage) {
                    resolvedBlock = fromStorage;
                    _setSelectedBlock(resolvedBlock);
                }
            } catch {}
        }

        fetch("/api/hostel/blocks")
            .then((r) => r.json())
            .then((d) => {
                const list: string[] = d.blocks || [];
                setBlocks(list);

                // Validate the active block against the canonical list — fallback to "all"
                _setSelectedBlock((prev: string) => {
                    const blockToCheck = resolvedBlock || prev;
                    if (blockToCheck === "all" || list.includes(blockToCheck)) return blockToCheck;
                    return "all";
                });
            })
            .catch(() => setBlocks([]))
            .finally(() => setBlocksLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Internal setter — updates state, localStorage, and URL
    const setSelectedBlock = useCallback(
        (block: string) => {
            _setSelectedBlock(block);

            // Persist to localStorage
            try {
                localStorage.setItem(LS_KEY, block);
            } catch {}

            // Sync URL — preserve all existing params, just update `block`
            const params = new URLSearchParams(searchParams.toString());
            if (block === "all") {
                params.delete("block");
            } else {
                params.set("block", block);
            }
            const qs = params.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    // Keep state in sync when URL changes externally (e.g., browser back/forward)
    useEffect(() => {
        const fromUrl = searchParams.get("block");
        if (fromUrl !== null) {
            _setSelectedBlock(fromUrl || "all");
        }
    }, [searchParams]);

    return (
        <HostelBlockContext.Provider
            value={{ selectedBlock, setSelectedBlock, blocks, blocksLoading }}
        >
            {children}
        </HostelBlockContext.Provider>
    );
}
