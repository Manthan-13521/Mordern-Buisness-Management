import { redirect } from "next/navigation";

export default async function AdminIndexPage({ params }: { params: Promise<{ poolslug: string }> }) {
    const pSlug = await params;
    redirect(`/${pSlug.poolslug}/admin/dashboard`);
}
