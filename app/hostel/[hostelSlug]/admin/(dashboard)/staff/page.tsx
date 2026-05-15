"use client";

import { useEffect, useState, useMemo, use } from "react";
import { Plus, Search, Loader2, X, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import { LabourSummary } from "@/components/admin/labour/LabourSummary";
import { LabourRow } from "@/components/admin/labour/LabourRow";
import { useHostelStaff } from "@/hooks/useAnalytics";

const ROLES = ["Warden", "Cook", "Security", "Cleaner", "Worker", "Staff", "Other"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HostelStaffPage(props: { params: Promise<{ hostelSlug: string }> }) {
  const { hostelSlug } = use(props.params);
  const { data: serverLabours, isLoading: loading, refetch: fetchData } = useHostelStaff(hostelSlug);
  const [labours, setLabours] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Bulk attendance state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);

  useEffect(() => {
    if (serverLabours) {
      setLabours(serverLabours);
    }
  }, [serverLabours]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLabour, setNewLabour] = useState({ name: "", role: "Warden", salary: 0, phone: "" });
  const [customRole, setCustomRole] = useState("");

  const markAttendance = async (staffId: string, status: string) => {
    const today = dateKey(new Date());
    const previousLabours = [...labours];
    setLabours(prev => prev.map(l => {
      if (l._id === staffId) {
        const attendance = l.recentAttendance || [];
        const existingIdx = attendance.findIndex((a: any) => dateKey(new Date(a.date)) === today);
        const newAttendance = [...attendance];
        if (existingIdx > -1) {
          newAttendance[existingIdx] = { ...newAttendance[existingIdx], status };
        } else {
          newAttendance.push({ date: new Date().toISOString(), status });
        }
        return { ...l, recentAttendance: newAttendance };
      }
      return l;
    }));

    try {
      const res = await fetch(`/api/hostel/${hostelSlug}/staff/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, records: [{ labourId: staffId, status }] }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Attendance marked");
      fetchData();
    } catch {
      toast.error("Failed to mark");
      setLabours(previousLabours);
    }
  };

  const handlePay = async (staffId: string, amount: number) => {
    const previousLabours = [...labours];
    setLabours(prev => prev.map(l => {
      if (l._id === staffId) {
        return { 
          ...l, 
          payments: [...(l.payments || []), { amount, date: new Date().toISOString(), notes: "Salary" }] 
        };
      }
      return l;
    }));

    try {
      const res = await fetch(`/api/hostel/${hostelSlug}/staff/${staffId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment recorded");
      fetchData();
    } catch {
      toast.error("Failed to record payment");
      setLabours(previousLabours);
    }
  };

  const handleAdvance = async (staffId: string, amount: number) => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const previousLabours = [...labours];
    setLabours(prev => prev.map(l => {
      if (l._id === staffId) {
        return { ...l, advancePaid: amount };
      }
      return l;
    }));

    try {
      const res = await fetch(`/api/hostel/${hostelSlug}/staff/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, month, amount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Advance updated");
      fetchData();
    } catch {
      toast.error("Failed to update advance");
      setLabours(previousLabours);
    }
  };

  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    const role = newLabour.role === "Other" ? customRole : newLabour.role;
    if (!newLabour.name || !role || !newLabour.salary) return toast.error("Fill all fields");

    setIsSaving(true);
    try {
      const res = await fetch(`/api/hostel/${hostelSlug}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLabour, role }),
      });
      if (res.ok) {
        toast.success("Staff hired!");
        setShowAddModal(false);
        setNewLabour({ name: "", role: "Warden", salary: 0, phone: "" });
        fetchData();
      } else toast.error("Failed to add");
    } finally {
      setIsSaving(false);
    }
  };

  const getStats = (staff: any) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const attendance = staff.recentAttendance || [];
    const monthAtt = attendance.filter((a: any) => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let present = 0, half_day = 0;
    monthAtt.forEach((a: any) => {
      const s = (a.status || "").toLowerCase();
      if (s === "present") present++;
      else if (s === "half_day") half_day++;
    });

    const safeSalary = staff.salary || 0;
    // Hostel staff salary is per month — calculate daily rate from it
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyRate = safeSalary / daysInMonth;
    const earnedThisMonth = (present * dailyRate) + (half_day * 0.5 * dailyRate);
    
    let totalPresent = 0, totalHalf = 0;
    attendance.forEach((a: any) => {
      const s = (a.status || "").toLowerCase();
      if (s === "present") totalPresent++;
      else if (s === "half_day") totalHalf++;
    });

    // For lifetime earned, compute per-month daily rate for accuracy
    // Group attendance by month to get correct daily rates
    const monthlyGroups: Record<string, { present: number; half: number; year: number; month: number }> = {};
    attendance.forEach((a: any) => {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthlyGroups[key]) monthlyGroups[key] = { present: 0, half: 0, year: d.getFullYear(), month: d.getMonth() };
      const s = (a.status || "").toLowerCase();
      if (s === "present") monthlyGroups[key].present++;
      else if (s === "half_day") monthlyGroups[key].half++;
    });

    let lifetimeEarned = 0;
    Object.values(monthlyGroups).forEach(g => {
      const dim = new Date(g.year, g.month + 1, 0).getDate();
      const dr = safeSalary / dim;
      lifetimeEarned += (g.present * dr) + (g.half * 0.5 * dr);
    });

    const totalPaid = (staff.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
    const due = Math.max(0, Math.round(lifetimeEarned - totalPaid));
    const advance = Math.max(0, Math.round(totalPaid - lifetimeEarned));
    
    return { present, earned: Math.round(earnedThisMonth), totalPaid, due, advance };
  };

  const summary = useMemo(() => {
    let totalStaff = labours.length;
    let presentToday = 0;
    let totalPaidMonth = 0;
    let totalDue = 0;
    let totalAdvance = 0;
    const today = dateKey(new Date());

    labours.forEach(staff => {
      const stats = getStats(staff);
      totalDue += stats.due;
      totalAdvance += stats.advance + (staff.advancePaid || 0);
      
      const hasToday = (staff.recentAttendance || []).find((a: any) => {
        const s = (a.status || "").toLowerCase();
        return dateKey(new Date(a.date)) === today && (s === 'present' || s === 'half_day');
      });
      if (hasToday) presentToday++;
      totalPaidMonth += stats.totalPaid; 
    });

    return { totalStaff, presentToday, totalPaid: totalPaidMonth, totalDue, totalAdvance };
  }, [labours]);

  const filtered = labours.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ background: "#020617", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color="#8b5cf6" size={40} />
      </div>
    );
  }

  return (
    <div style={{ background: "#020617", minHeight: "100vh", padding: "24px", color: "#f9fafb" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Hostel Staff</h1>
            <p style={{ color: "#9ca3af", margin: "4px 0 0" }}>Manage daily attendance and payroll</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              background: "#8b5cf6", 
              color: "#fff", 
              border: "none", 
              borderRadius: "12px", 
              padding: "10px 20px", 
              fontWeight: 700, 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              cursor: "pointer"
            }}
          >
            <Plus size={20} /> Hire Staff
          </button>
        </div>

        <LabourSummary {...summary} />

        {/* Search + Bulk Action */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} size={18} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: "100%", 
                background: "#0b1220", 
                border: "1px solid #1f2937", 
                borderRadius: "14px", 
                padding: "12px 16px 12px 48px", 
                color: "#fff", 
                outline: "none" 
              }} 
            />
          </div>
          {selectedIds.size > 0 && (
            <button
              disabled={bulkMarking}
              onClick={async () => {
                const today = dateKey(new Date());
                const ids = Array.from(selectedIds);
                setBulkMarking(true);
                const prev = [...labours];
                setLabours(l => l.map(s => ids.includes(s._id) ? {
                  ...s,
                  recentAttendance: [
                    ...(s.recentAttendance || []).filter((a: any) => dateKey(new Date(a.date)) !== today),
                    { date: new Date().toISOString(), status: "present" }
                  ]
                } : s));
                try {
                  const res = await fetch(`/api/hostel/${hostelSlug}/staff/attendance`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: today, records: ids.map(id => ({ labourId: id, status: "present" })) }),
                  });
                  if (!res.ok) throw new Error("Failed");
                  toast.success(`Marked ${ids.length} staff present`);
                  setSelectedIds(new Set());
                  fetchData();
                } catch {
                  toast.error("Failed to mark attendance");
                  setLabours(prev);
                } finally {
                  setBulkMarking(false);
                }
              }}
              style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "10px 20px",
                fontWeight: 700,
                cursor: bulkMarking ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: bulkMarking ? 0.7 : 1,
                whiteSpace: "nowrap",
                transition: "opacity 0.2s",
              }}
            >
              {bulkMarking ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
              Mark Attendance ({selectedIds.size})
            </button>
          )}
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "28px 2fr 1fr 1fr 1fr 1fr 1fr 1fr auto", 
          padding: "0 16px 12px", 
          fontSize: "11px", 
          fontWeight: 700, 
          color: "#6b7280", 
          textTransform: "uppercase", 
          letterSpacing: "1px",
          alignItems: "center",
        }}>
          <div>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(s => selectedIds.has(s._id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(filtered.map(s => s._id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              style={{ accentColor: "#8b5cf6", cursor: "pointer", width: "15px", height: "15px" }}
            />
          </div>
          <div>Name</div>
          <div>₹/Month</div>
          <div>Present</div>
          <div>Earned</div>
          <div>Paid</div>
          <div>Due</div>
          <div>Status</div>
          <div style={{ width: "18px" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map(staff => {
            const stats = getStats(staff);
            const today = dateKey(new Date());
            const todayStatus = ((staff.recentAttendance || []).find((a: any) => dateKey(new Date(a.date)) === today)?.status || "").toLowerCase() || null;

            return (
              <div key={staff._id} style={{ display: "flex", alignItems: "stretch", gap: "0" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "44px",
                  flexShrink: 0,
                }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(staff._id)}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(staff._id);
                      else next.delete(staff._id);
                      setSelectedIds(next);
                    }}
                    style={{ accentColor: "#8b5cf6", cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <LabourRow 
                    staff={staff}
                    stats={stats}
                    todayStatus={todayStatus}
                    isExpanded={expandedRow === staff._id}
                    onToggle={() => setExpandedRow(expandedRow === staff._id ? null : staff._id)}
                    onMarkAttendance={(status) => markAttendance(staff._id, status)}
                    onPay={(amount) => handlePay(staff._id, amount)}
                    onUpdateAdvance={(amount) => handleAdvance(staff._id, amount)}
                    unit="mo"
                    type="hostel"
                    slug={hostelSlug}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
            No staff found.
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowAddModal(false)} />
          <div style={{ position: "relative", background: "#0b1220", borderRadius: "20px", width: "100%", maxWidth: "400px", border: "1px solid #1f2937", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Hire Staff</h3>
              <X onClick={() => setShowAddModal(false)} style={{ cursor: "pointer", color: "#6b7280" }} />
            </div>
            <form onSubmit={handleAddLabour} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input required placeholder="Full Name" value={newLabour.name} onChange={e => setNewLabour({...newLabour, name: e.target.value})} style={{ background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff" }} />
              <div style={{ display: "flex", gap: "12px" }}>
                <select value={newLabour.role} onChange={e => setNewLabour({...newLabour, role: e.target.value})} style={{ flex: 1, background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff" }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input required type="number" placeholder="Salary/Month" value={newLabour.salary || ""} onChange={e => setNewLabour({...newLabour, salary: Number(e.target.value)})} style={{ flex: 1, background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff" }} />
              </div>
              <button type="submit" disabled={isSaving} style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 700, cursor: "pointer" }}>
                {isSaving ? "Saving..." : "Hire Staff"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
