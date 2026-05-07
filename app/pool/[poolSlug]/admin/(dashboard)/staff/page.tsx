"use client";

import { useEffect, useState, useMemo, use } from "react";
import { Plus, Search, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { LabourSummary } from "@/components/admin/labour/LabourSummary";
import { LabourRow } from "@/components/admin/labour/LabourRow";
import { usePoolStaff } from "@/hooks/useAnalytics";

const ROLES = ["Trainer", "Lifeguard", "Cleaner", "Manager", "Staff", "Other"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PoolStaffPage(props: { params: Promise<{ poolSlug: string }> }) {
  const { poolSlug } = use(props.params);
  const { data: serverLabours, isLoading: loading, refetch: fetchData } = usePoolStaff(poolSlug);
  const [labours, setLabours] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (serverLabours) {
      setLabours(serverLabours);
    }
  }, [serverLabours]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLabour, setNewLabour] = useState({ name: "", role: "Trainer", salary: 0, phone: "" });
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
      const res = await fetch(`/api/pool/${poolSlug}/staff/attendance`, {
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
      const res = await fetch(`/api/pool/${poolSlug}/staff/${staffId}/payments`, {
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
      const res = await fetch(`/api/pool/${poolSlug}/staff/advance`, {
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
      const res = await fetch(`/api/pool/${poolSlug}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLabour, role }),
      });
      if (res.ok) {
        toast.success("Staff hired!");
        setShowAddModal(false);
        setNewLabour({ name: "", role: "Trainer", salary: 0, phone: "" });
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
      if (a.status === "present") present++;
      else if (a.status === "half_day") half_day++;
    });

    const safeSalary = staff.salary || 0;
    const earnedThisMonth = (present * safeSalary) + (half_day * 0.5 * safeSalary);
    
    let totalPresent = 0, totalHalf = 0;
    attendance.forEach((a: any) => {
      if (a.status === "present") totalPresent++;
      else if (a.status === "half_day") totalHalf++;
    });

    const lifetimeEarned = (totalPresent * safeSalary) + (totalHalf * 0.5 * safeSalary);
    const totalPaid = (staff.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
    
    return { present, earned: earnedThisMonth, totalPaid, due: lifetimeEarned - totalPaid };
  };

  const summary = useMemo(() => {
    let totalStaff = labours.length;
    let presentToday = 0;
    let totalPaidMonth = 0;
    let totalDue = 0;
    const today = dateKey(new Date());

    labours.forEach(staff => {
      const stats = getStats(staff);
      totalDue += stats.due;
      
      const hasToday = (staff.recentAttendance || []).find((a: any) => dateKey(new Date(a.date)) === today && a.status === 'present');
      if (hasToday) presentToday++;
      totalPaidMonth += stats.totalPaid; 
    });

    return { totalStaff, presentToday, totalPaid: totalPaidMonth, totalDue };
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
            <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Pool Staff</h1>
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

        <div style={{ position: "relative", marginBottom: "20px" }}>
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

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr auto", 
          padding: "0 16px 12px", 
          fontSize: "11px", 
          fontWeight: 700, 
          color: "#6b7280", 
          textTransform: "uppercase", 
          letterSpacing: "1px" 
        }}>
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
            const todayStatus = (staff.recentAttendance || []).find((a: any) => dateKey(new Date(a.date)) === today)?.status || null;

            return (
              <LabourRow 
                key={staff._id}
                staff={staff}
                stats={stats}
                todayStatus={todayStatus}
                isExpanded={expandedRow === staff._id}
                onToggle={() => setExpandedRow(expandedRow === staff._id ? null : staff._id)}
                onMarkAttendance={(status) => markAttendance(staff._id, status)}
                onPay={(amount) => handlePay(staff._id, amount)}
                onUpdateAdvance={(amount) => handleAdvance(staff._id, amount)}
                unit="mo"
                type="pool"
                slug={poolSlug}
              />
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
