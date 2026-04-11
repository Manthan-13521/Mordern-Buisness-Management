"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users2,
  Plus,
  Search,
  Loader2,
  Briefcase,
  Phone,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  Clock,
  UserCheck,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                   */
/* ═══════════════════════════════════════════════════════════ */

const ROLES = ["Staff", "Cleaner", "Trainer", "Guard", "Other"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number) {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getMonthLabel(year: number, month: number) {
  return new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
}

const statusColor: Record<string, string> = {
  present: "#22c55e",
  half_day: "#facc15",
  absent: "#ef4444",
};

const statusBg: Record<string, string> = {
  present: "#22c55e20",
  half_day: "#facc1520",
  absent: "#ef444420",
};

const statusLabel: Record<string, string> = {
  present: "Present",
  half_day: "Half Day",
  absent: "Absent",
};

/* ═══════════════════════════════════════════════════════════ */
/*  MINI CALENDAR COMPONENT                                   */
/* ═══════════════════════════════════════════════════════════ */

function MiniCalendar({
  year,
  month,
  attendanceMap,
  onDayClick,
}: {
  year: number;
  month: number;
  attendanceMap: Record<string, string>;
  onDayClick: (dateStr: string, currentStatus: string | null) => void;
}) {
  const days = getMonthDays(year, month);
  const firstDow = days[0].getDay(); // 0=Sun
  const blanks = Array.from({ length: firstDow });
  const today = dateKey(new Date());

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8, textAlign: "center" }}>
        {getMonthLabel(year, month)}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 10, textAlign: "center", color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => {
          const dk = dateKey(d);
          const status = attendanceMap[dk] || null;
          const isToday = dk === today;
          const bg = status ? statusBg[status] : "#1e293b";
          const border = status ? statusColor[status] : isToday ? "#8b5cf6" : "#334155";

          return (
            <button
              type="button"
              key={dk}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isToday) onDayClick(dk, status); 
              }}
              title={isToday ? `${dk}: Click to mark` : `${dk}: ${status ? statusLabel[status] : "No record"} (Locked)`}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 6,
                border: `2px solid ${border}`,
                background: bg,
                fontSize: 11,
                fontWeight: isToday ? 800 : 500,
                color: status ? statusColor[status] : "#94a3b8",
                cursor: isToday ? "pointer" : "default",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isToday ? 1 : 0.7
              }}
              onMouseOver={(e) => {
                if (isToday) {
                  (e.target as HTMLElement).style.transform = "scale(1.12)";
                  (e.target as HTMLElement).style.zIndex = "2";
                }
              }}
              onMouseOut={(e) => {
                if (isToday) {
                  (e.target as HTMLElement).style.transform = "scale(1)";
                  (e.target as HTMLElement).style.zIndex = "0";
                }
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function LabourPage() {
  const [labours, setLabours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Labour
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLabour, setNewLabour] = useState({ name: "", role: "Staff", salary: 0, phone: "" });
  const [customRole, setCustomRole] = useState("");

  // Payment Modal
  const [activeLabour, setActiveLabour] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmt, setPaymentAmt] = useState<number | "">("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Calendar modal
  const [calendarLabour, setCalendarLabour] = useState<any>(null);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Month filter for salary calc
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  /* ── DATA FETCH ── */
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/business/labour");
      const data = await res.json();
      setLabours(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── QUICK ATTENDANCE ── */
  async function quickAttendance(staffId: string, status: string) {
    const today = dateKey(new Date());
    try {
      const res = await fetch("/api/business/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, records: [{ labourId: staffId, status }] }),
      });
      if (res.ok) {
        toast.success(`Marked ${statusLabel[status]}`);
        fetchData();
      } else {
        toast.error("Failed to mark");
      }
    } catch {
      toast.error("Network error");
    }
  }

  /* ── CALENDAR DAY CLICK ── */
  async function handleCalendarDayClick(labourId: string, dateStr: string, currentStatus: string | null) {
    const cycle = ["present", "half_day", "absent"];
    const nextIdx = currentStatus ? (cycle.indexOf(currentStatus) + 1) % cycle.length : 0;
    const nextStatus = cycle[nextIdx];

    try {
      const res = await fetch("/api/business/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, records: [{ labourId, status: nextStatus }] }),
      });
      if (res.ok) {
        toast.success(`${dateStr}: ${statusLabel[nextStatus]}`);
        fetchData();
      } else {
        toast.error("Failed to mark attendance");
      }
    } catch {
      toast.error("Network error");
    }
  }

  /* ── ADD LABOUR ── */
  async function handleAddLabour(e: React.FormEvent) {
    e.preventDefault();
    const role = newLabour.role === "Other" ? customRole : newLabour.role;
    if (!newLabour.name || !role) return toast.error("Fill required fields");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/labour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLabour, role }),
      });
      if (res.ok) {
        toast.success("Staff hired!");
        setShowAddModal(false);
        setNewLabour({ name: "", role: "Staff", salary: 0, phone: "" });
        setCustomRole("");
        fetchData();
      } else toast.error("Failed to add");
    } catch {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  /* ── RECORD PAYMENT ── */
  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmt || paymentAmt <= 0) return toast.error("Enter valid amount");

    setIsSaving(true);
    try {
      const res = await fetch(`/api/business/labour/${activeLabour._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(paymentAmt), notes: paymentNotes }),
      });
      if (res.ok) {
        toast.success("Payment recorded");
        setShowPaymentModal(false);
        setPaymentAmt("");
        setPaymentNotes("");
        fetchData();
      } else toast.error("Failed");
    } catch {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  /* ── CALCULATIONS ── */
  function getMonthAttendance(staff: any) {
    const attendance = staff.recentAttendance || [];
    return attendance.filter((a: any) => {
      const d = new Date(a.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }

  function getStats(staff: any) {
    const monthAtt = getMonthAttendance(staff);
    let present = 0, half_day = 0, absent = 0;
    monthAtt.forEach((a: any) => {
      if (a.status === "present") present++;
      else if (a.status === "half_day") half_day++;
      else if (a.status === "absent") absent++;
    });
    const earnedThisMonth = present * staff.salary + half_day * 0.5 * staff.salary;

    let totalPresentAllTime = 0, totalHalfAllTime = 0;
    (staff.recentAttendance || []).forEach((a: any) => {
      if (a.status === "present") totalPresentAllTime++;
      else if (a.status === "half_day") totalHalfAllTime++;
    });
    const earnedAllTime = totalPresentAllTime * staff.salary + totalHalfAllTime * 0.5 * staff.salary;

    const totalPaid = (staff.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
    
    // Due is based on Lifetime Earned minus Lifetime Paid
    const due = earnedAllTime - totalPaid;
    
    return { present, half_day, absent, earned: earnedThisMonth, totalPaid, due };
  }

  function buildAttendanceMap(staff: any): Record<string, string> {
    const map: Record<string, string> = {};
    (staff.recentAttendance || []).forEach((a: any) => {
      map[dateKey(new Date(a.date))] = a.status;
    });
    return map;
  }

  /* ── SUMMARY TOTALS ── */
  const summary = useMemo(() => {
    let totalPresent = 0, totalHalf = 0, totalEarned = 0, totalPaid = 0;
    labours.forEach((s) => {
      const st = getStats(s);
      totalPresent += st.present;
      totalHalf += st.half_day;
      totalEarned += st.earned;
      totalPaid += st.totalPaid;
    });
    return { totalPresent, totalHalf, totalEarned, totalPaid, totalDue: totalEarned - totalPaid, totalStaff: labours.length };
  }, [labours, selectedMonth, selectedYear]);

  /* ── MONTH OPTIONS ── */
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({ month: d.getMonth(), year: d.getFullYear(), label: getMonthLabel(d.getFullYear(), d.getMonth()) });
    }
    return opts;
  }, []);

  /* ── CALENDAR MONTHS (3) ── */
  const calMonths = useMemo(() => {
    const arr = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return arr;
  }, []);

  /* ── CSV EXPORT ── */
  function exportCSV() {
    const header = "Name,Role,Daily Wage,Present Days,Half Days,Absent,Salary Earned,Total Paid,Due\n";
    const rows = labours.map((s) => {
      const st = getStats(s);
      return `"${s.name}","${s.role}",${s.salary},${st.present},${st.half_day},${st.absent},${st.earned},${st.totalPaid},${st.due}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-report-${getMonthLabel(selectedYear, selectedMonth).replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  }

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const filtered = labours.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.role.toLowerCase().includes(search.toLowerCase())
  );

  /* ═══════════════════════════════════════════════════════════ */
  /*  STYLES                                                    */
  /* ═══════════════════════════════════════════════════════════ */
  const S = {
    page: { background: "#020617", minHeight: "100vh", padding: "24px 16px", fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    card: { background: "#0b1220", borderRadius: 16, border: "1px solid #1f2937", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", overflow: "hidden" as const, transition: "all 0.2s" } as React.CSSProperties,
    input: { width: "100%", background: "#020617", border: "1.5px solid #1f2937", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#f9fafb", outline: "none", fontWeight: 500, transition: "border 0.2s" } as React.CSSProperties,
    label: { display: "block", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 6 } as React.CSSProperties,
    btnPrimary: { background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" } as React.CSSProperties,
  };

  /* ═══════════════════════════════════════════════════════════ */
  /*  RENDER                                                    */
  /* ═══════════════════════════════════════════════════════════ */

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* ── HEADER ── */}
        <div style={{ ...S.card, padding: "24px 28px", marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#f9fafb", margin: 0, letterSpacing: -0.5 }}>👷 Workforce</h2>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "4px 0 0", fontWeight: 500 }}>Manage staff, attendance, salary & payments</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
              style={{ ...S.input, width: "auto", padding: "10px 14px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}
            >
              {monthOptions.map((o) => (
                <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>{o.label}</option>
              ))}
            </select>
            <button onClick={exportCSV} style={{ ...S.btnPrimary, background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "10px 18px", fontSize: 13 }}>
              <Download style={{ width: 16, height: 16 }} /> Export
            </button>
            <button onClick={() => setShowAddModal(true)} style={{ ...S.btnPrimary, borderRadius: 10, padding: "10px 18px", fontSize: 13 }}>
              <Plus style={{ width: 16, height: 16 }} /> Hire Staff
            </button>
          </div>
        </div>

        {/* ── SUMMARY PANEL ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            { icon: <Users2 style={{ width: 20, height: 20 }} />, label: "Total Staff", value: summary.totalStaff, color: "#8b5cf6", bg: "#8b5cf615" },
            { icon: <UserCheck style={{ width: 20, height: 20 }} />, label: "Present Days", value: summary.totalPresent, color: "#22c55e", bg: "#22c55e15" },
            { icon: <Clock style={{ width: 20, height: 20 }} />, label: "Half Days", value: summary.totalHalf, color: "#eab308", bg: "#eab30815" },
            { icon: <TrendingUp style={{ width: 20, height: 20 }} />, label: "Salary Earned", value: `₹${summary.totalEarned.toLocaleString()}`, color: "#8b5cf6", bg: "#8b5cf615" },
            { icon: <Wallet style={{ width: 20, height: 20 }} />, label: "Total Paid", value: `₹${summary.totalPaid.toLocaleString()}`, color: "#22c55e", bg: "#22c55e15" },
            { icon: <IndianRupee style={{ width: 20, height: 20 }} />, label: "Due", value: `₹${Math.abs(summary.totalDue).toLocaleString()}`, color: summary.totalDue > 0 ? "#ef4444" : "#22c55e", bg: summary.totalDue > 0 ? "#ef444415" : "#22c55e15" },
          ].map((item, i) => (
            <div key={i} style={{ ...S.card, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: item.color, margin: "2px 0 0" }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── SEARCH ── */}
        <div style={{ position: "relative", marginBottom: 18 }}>
          <Search style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#6b7280" }} />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.input, paddingLeft: 44, borderRadius: 14 }}
          />
        </div>

        {/* ── STAFF LIST ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80, background: "#0b1220", borderRadius: 16, border: "1px solid #1f2937" }}>
            <Loader2 style={{ width: 32, height: 32, color: "#8b5cf6", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((staff) => {
              const attMap = buildAttendanceMap(staff);
              const stats = getStats(staff);
              const todayStatus = attMap[dateKey(new Date())] || null;
              const isExpanded = expandedRows.has(staff._id);

              return (
                <div key={staff._id} style={{ ...S.card, borderColor: isExpanded ? "#8b5cf630" : "#1f2937" }}>
                  {/* ── CARD HEADER ── */}
                  <div
                    style={{ padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer", transition: "background 0.15s" }}
                    onClick={() => toggleRow(staff._id)}
                    onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = "#111827")}
                    onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#8b5cf615", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0, border: "1px solid #8b5cf620" }}>
                        {staff.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: 17, fontWeight: 700, color: "#f9fafb", margin: 0 }}>{staff.name}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#9ca3af", background: "#111827", padding: "3px 10px", borderRadius: 8, border: "1px solid #1f2937" }}>
                            <Briefcase style={{ width: 12, height: 12 }} /> {staff.role}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                            ₹{staff.salary}<span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>/day</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Quick Actions */}
                      {/* Pay Salary - prominent */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setActiveLabour(staff); setShowPaymentModal(true); }}
                          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#fff", background: "#22c55e", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 2px 8px #22c55e40" }}
                        >
                          <CreditCard style={{ width: 14, height: 14 }} /> Pay Salary
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => quickAttendance(staff._id, "present")}
                          title="Mark Present"
                          style={{ width: 38, height: 38, borderRadius: 10, border: todayStatus === "present" ? "2px solid #22c55e" : "1.5px solid #1f2937", background: todayStatus === "present" ? "#22c55e20" : "#111827", color: "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, transition: "all 0.15s" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => quickAttendance(staff._id, "half_day")}
                          title="Mark Half Day"
                          style={{ width: 38, height: 38, borderRadius: 10, border: todayStatus === "half_day" ? "2px solid #eab308" : "1.5px solid #1f2937", background: todayStatus === "half_day" ? "#eab30820" : "#111827", color: "#eab308", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, transition: "all 0.15s" }}
                        >
                          ½
                        </button>
                        <button
                          onClick={() => quickAttendance(staff._id, "absent")}
                          title="Mark Absent"
                          style={{ width: 38, height: 38, borderRadius: 10, border: todayStatus === "absent" ? "2px solid #ef4444" : "1.5px solid #1f2937", background: todayStatus === "absent" ? "#ef444420" : "#111827", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, transition: "all 0.15s" }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Summary pills */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ textAlign: "center", minWidth: 56 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Earned</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: "#8b5cf6", margin: "2px 0 0" }}>₹{stats.earned.toLocaleString()}</p>
                        </div>
                        <div style={{ textAlign: "center", minWidth: 50 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Due</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: stats.due > 0 ? "#ef4444" : "#22c55e", margin: "2px 0 0" }}>
                            {stats.due < 0 ? `+₹${Math.abs(stats.due)}` : `₹${stats.due}`}
                          </p>
                        </div>
                      </div>

                      <button style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #1f2937", background: "#111827", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "all 0.15s" }}>
                        {isExpanded ? <ChevronUp style={{ width: 18, height: 18 }} /> : <ChevronDown style={{ width: 18, height: 18 }} />}
                      </button>
                    </div>
                  </div>

                  {/* ── EXPANDED PANEL ── */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #1f2937", background: "#020617", padding: "22px 24px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* LEFT: Attendance Stats + Calendar */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <h5 style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>
                              Attendance — {getMonthLabel(selectedYear, selectedMonth)}
                            </h5>
                          </div>

                          {/* Stat cards */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                            {[
                              { label: "Present", value: stats.present, color: "#22c55e", bg: "#22c55e15" },
                              { label: "Half Day", value: stats.half_day, color: "#eab308", bg: "#eab30815" },
                              { label: "Absent", value: stats.absent, color: "#ef4444", bg: "#ef444415" },
                            ].map((s) => (
                              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 10px", textAlign: "center", border: `1px solid ${s.color}25` }}>
                                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                                <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 1, margin: "4px 0 0", opacity: 0.8 }}>{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* 3-month calendars */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                            {calMonths.map((cm) => (
                              <MiniCalendar
                                key={`${cm.year}-${cm.month}`}
                                year={cm.year}
                                month={cm.month}
                                attendanceMap={attMap}
                                onDayClick={(dateStr, cs) => handleCalendarDayClick(staff._id, dateStr, cs)}
                              />
                            ))}
                          </div>

                          {/* Legend */}
                          <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                            {[
                              { label: "Present", color: "#22c55e", bg: "#22c55e20" },
                              { label: "Half Day", color: "#eab308", bg: "#eab30820" },
                              { label: "Absent", color: "#ef4444", bg: "#ef444420" },
                              { label: "No Record", color: "#6b7280", bg: "#1e293b" },
                            ].map((l) => (
                              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.color}` }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af" }}>{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* RIGHT: Financials */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <h5 style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>Financials</h5>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveLabour(staff); setShowPaymentModal(true); }}
                              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#22c55e", background: "#22c55e15", border: "1px solid #22c55e30", borderRadius: 8, padding: "6px 14px", cursor: "pointer", transition: "all 0.15s" }}
                            >
                              <CreditCard style={{ width: 14, height: 14 }} /> Pay Salary
                            </button>
                          </div>

                          {/* Salary summary */}
                          <div style={{ background: "#0b1220", borderRadius: 14, border: "1px solid #1f2937", padding: 18, marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Salary Earned</span>
                              <span style={{ fontSize: 16, fontWeight: 800, color: "#8b5cf6" }}>₹{stats.earned.toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Total Paid</span>
                              <span style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>₹{stats.totalPaid.toLocaleString()}</span>
                            </div>
                            <div style={{ borderTop: "1.5px solid #1f2937", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#f9fafb" }}>Overall Due Balance</span>
                              <span style={{ fontSize: 20, fontWeight: 800, color: stats.due > 0 ? "#ef4444" : "#22c55e" }}>
                                {stats.due < 0 ? `+ ₹${Math.abs(stats.due).toLocaleString()}` : `₹${stats.due.toLocaleString()}`}
                              </span>
                            </div>
                          </div>

                          {/* Payment history */}
                          <div style={{ background: "#0b1220", borderRadius: 14, border: "1px solid #1f2937", maxHeight: 200, overflow: "auto" }}>
                            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1f2937", position: "sticky", top: 0, background: "#0b1220", zIndex: 1 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Payment History</p>
                            </div>
                            {staff.payments?.length > 0 ? (
                              <div>
                                {staff.payments.map((pay: any, idx: number) => (
                                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #1f293750" }}>
                                    <div>
                                      <p style={{ fontSize: 14, fontWeight: 700, color: "#f9fafb", margin: 0 }}>
                                        ₹{pay.amount.toLocaleString()}
                                      </p>
                                      <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>{pay.notes || "Salary"}</p>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", background: "#020617", padding: "4px 10px", borderRadius: 6, border: "1px solid #1f2937" }}>
                                      {new Date(pay.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ padding: 30, textAlign: "center", color: "#4b5563", fontSize: 13, fontWeight: 500 }}>
                                No payments yet
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ ...S.card, padding: "60px 20px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid #1f2937" }}>
              <Users2 style={{ width: 28, height: 28, color: "#6b7280" }} />
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", margin: "0 0 6px" }}>No staff found</h4>
            <p style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Tap "Hire Staff" to add your team.</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  HIRE MODAL                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddModal(false)} />
          <div style={{ position: "relative", background: "#0b1220", borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "1px solid #1f2937" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", margin: 0 }}>👷 Onboard Worker</h3>
              <button onClick={() => setShowAddModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #1f2937", background: "#111827", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <form onSubmit={handleAddLabour} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={S.label}>Full Name *</label>
                <input required value={newLabour.name} onChange={(e) => setNewLabour({ ...newLabour, name: e.target.value })} placeholder="E.g. Suresh Kumar" style={S.input} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.label}>Role *</label>
                  <select
                    value={newLabour.role}
                    onChange={(e) => setNewLabour({ ...newLabour, role: e.target.value })}
                    style={{ ...S.input, cursor: "pointer", appearance: "auto" as any }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Daily Wage (₹) *</label>
                  <input required type="number" value={newLabour.salary || ""} onChange={(e) => setNewLabour({ ...newLabour, salary: Number(e.target.value) })} style={S.input} />
                </div>
              </div>
              {newLabour.role === "Other" && (
                <div>
                  <label style={S.label}>Custom Role *</label>
                  <input required value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="E.g. Supervisor" style={S.input} />
                </div>
              )}
              <div>
                <label style={S.label}>Phone <span style={{ opacity: 0.5 }}>(Optional)</span></label>
                <input type="tel" value={newLabour.phone} onChange={(e) => setNewLabour({ ...newLabour, phone: e.target.value })} placeholder="9876543210" style={S.input} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #1f2937", background: "#111827", color: "#9ca3af", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} style={{ ...S.btnPrimary, flex: 2, justifyContent: "center", opacity: isSaving ? 0.6 : 1 }}>
                  {isSaving ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : "Hire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/*  PAYMENT MODAL                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      {showPaymentModal && activeLabour && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setShowPaymentModal(false)} />
          <div style={{ position: "relative", background: "#0b1220", borderRadius: 20, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "1px solid #1f2937" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", margin: 0 }}>💸 Record Payment</h3>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: 1 }}>{activeLabour.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #1f2937", background: "#111827", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={S.label}>Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <IndianRupee style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#8b5cf6" }} />
                  <input autoFocus required type="number" value={paymentAmt} onChange={(e) => setPaymentAmt(Number(e.target.value))} style={{ ...S.input, paddingLeft: 38, fontSize: 18, fontWeight: 700 }} />
                </div>
              </div>
              <div>
                <label style={S.label}>Description</label>
                <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="E.g. Full month salary" style={S.input} />
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #1f2937", background: "#111827", color: "#9ca3af", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} style={{ ...S.btnPrimary, flex: 2, justifyContent: "center", background: "#22c55e", opacity: isSaving ? 0.6 : 1 }}>
                  {isSaving ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
