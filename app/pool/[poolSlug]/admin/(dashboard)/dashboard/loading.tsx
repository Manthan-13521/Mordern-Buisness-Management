import ChartSkeleton from "@/components/ChartSkeleton";

export default function LoadingDashboard() {
    return (
        <div className="space-y-8">
            <div className="animate-pulse">
                <div className="h-8 w-64 bg-gray-200 bg-[#0b1220] border border-[#1f2937] rounded mb-2"></div>
                <div className="h-4 w-96 bg-gray-200 bg-[#0b1220] border border-[#1f2937] rounded"></div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ChartSkeleton />
                <ChartSkeleton />
                <ChartSkeleton />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="h-48 bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] rounded-xl animate-pulse"></div>
                <div className="h-48 bg-[#0b1220] bg-[#0b1220] border border-[#1f2937] rounded-xl animate-pulse"></div>
            </div>
        </div>
    );
}
