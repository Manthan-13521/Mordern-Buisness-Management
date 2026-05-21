export type MemberVerdict = "ACTIVE" | "EXPIRING" | "EXPIRED" | "DELETED" | "BLOCKED" | "WARNING";

export interface StatusResult {
    verdict: MemberVerdict;
    verdictClass: string;
    rowClass: string;
    daysLeftLabel: string;
    daysLeft: number;
    msLeft: number;
}

export function computeMemberStatus(member: any): StatusResult {
    const nowMs = Date.now();
    const endDate = new Date(member.planEndDate || member.expiryDate || 0);
    const msLeft = endDate.getTime() - nowMs;
    const daysLeft = Math.ceil(msLeft / 86400000);

    let verdict: MemberVerdict = "ACTIVE";
    let verdictClass = "bg-green-500/10 text-green-400 ring-green-600/20";
    let rowClass = "";
    let daysLeftLabel = "";

    if (member.isDeleted) {
        verdict = "DELETED";
        verdictClass = "bg-[#0b1220] text-[#9ca3af] ring-gray-500/20 border border-[#1f2937]";
        rowClass = "bg-rose-500/5";
        daysLeftLabel = "Deleted";
    } else if (member.defaulterStatus === "blocked") {
        verdict = "BLOCKED";
        verdictClass = "bg-red-700 text-white ring-red-600/30 shadow animate-pulse";
        rowClass = "bg-rose-500/10 border-l-4 border-rose-500";
        daysLeftLabel = `Blocked: ${member.overdueDays || 0}d overdue`;
    } else if (member.defaulterStatus === "warning") {
        verdict = "WARNING";
        verdictClass = "bg-rose-500/10 text-rose-400 ring-rose-600/30 font-bold border border-rose-500/20";
        rowClass = "bg-rose-500/5 border-l-4 border-rose-400";
        daysLeftLabel = `Warning: ${member.overdueDays || 0}d overdue`;
    } else if (member.isExpired || msLeft <= 0) {
        verdict = "EXPIRED";
        verdictClass = "bg-rose-500/10 text-rose-400 ring-red-600/20";
        rowClass = "bg-rose-500/5";
        daysLeftLabel = "Expired";
    } else {
        // Active
        if (daysLeft <= 1) {
            const hoursLeft = Math.floor(msLeft / 3600000);
            const minutesLeft = Math.floor(msLeft / 60000);
            if (hoursLeft < 1) {
                daysLeftLabel = `${minutesLeft} min${minutesLeft !== 1 ? 's' : ''} left`;
            } else if (hoursLeft < 24) {
                daysLeftLabel = `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} left`;
            } else {
                daysLeftLabel = "Expires today";
            }
        } else {
            daysLeftLabel = `${daysLeft} days left`;
        }

        if (daysLeft <= 7) {
            verdict = "EXPIRING";
            verdictClass = "bg-amber-500/10 text-amber-400 ring-amber-600/20";
            rowClass = "bg-amber-500/5";
        }
    }

    return { verdict, verdictClass, rowClass, daysLeftLabel, daysLeft, msLeft };
}
