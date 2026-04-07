import { redirect } from "next/navigation";

export default async function AdminIndexPage({ params }: { params: Promise<{ poolSlug: string }> }) {
    const pSlug = await params;
    redirect(`/pool/${pSlug.poolSlug}/admin/dashboard`);
}
