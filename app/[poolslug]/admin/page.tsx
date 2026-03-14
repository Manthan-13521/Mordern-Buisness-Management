import { redirect } from "next/navigation";

export default function AdminIndexPage({ params }: { params: { poolslug: string } }) {
    redirect(`/${params.poolslug}/admin/dashboard`);
}
