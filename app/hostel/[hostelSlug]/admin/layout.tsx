import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
    title: "Hostel Admin — Management System",
    description: "Hostel management administration panel",
};

export default function HostelRootLayout({ children }: { children: React.ReactNode }) {
    return <Providers>{children}</Providers>;
}
