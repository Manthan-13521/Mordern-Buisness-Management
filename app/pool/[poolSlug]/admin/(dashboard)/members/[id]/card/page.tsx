"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { MembershipCardPreview } from "@/components/members/MembershipCardPreview";

export default function MemberCardPreviewPage() {
    const params = useParams();
    const router = useRouter();
    
    const [member, setMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const memberId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

    useEffect(() => {
        if (!memberId) return;
        setLoading(true);
        fetch(`/api/members/${memberId}`)
            .then(r => r.json())
            .then(data => { setMember(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [memberId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    if (!member) {
        return <div className="text-center py-20 text-[#6b7280]">Member not found.</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between print:hidden">
                <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#f9fafb] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Member
                </button>
                <div className="flex gap-3">
                    <button onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-md transition">
                        <Printer className="h-4 w-4" /> Print Card
                    </button>
                    <a href={`/api/members/${memberId}/pdf`} download className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b1220] border border-[#1f2937] px-4 py-2 text-sm font-bold text-slate-300 shadow-md hover:bg-[#1f2937] transition">
                        <Download className="h-4 w-4" /> Download Legacy PDF
                    </a>
                </div>
            </div>

            <div className="bg-[#0b1220] border border-[#1f2937] p-8 rounded-3xl print:border-none print:p-0 print:bg-transparent shadow-2xl flex justify-center overflow-x-auto">
                <div className="w-full max-w-[1050px] min-w-[700px]">
                    <MembershipCardPreview member={member} />
                </div>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .id-card, .id-card * {
                        visibility: visible;
                    }
                    .card-wrapper {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 100vw;
                        max-width: 1050px;
                    }
                    body {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
