import { redirect } from "next/navigation";

export default async function HostelAdminRoot({ params }: { params: Promise<{ hostelSlug: string }> }) {
    const { hostelSlug } = await params;
    redirect(`/hostel/${hostelSlug}/admin/dashboard`);
}
