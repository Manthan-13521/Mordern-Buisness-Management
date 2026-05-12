"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, Search, Loader2, X, Truck, Trash2, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import { LabourSummary } from "@/components/admin/labour/LabourSummary";
import { LabourRow } from "@/components/admin/labour/LabourRow";
import { useBusinessLabour } from "@/hooks/useAnalytics";

const ROLES = ["Staff", "Cleaner", "Trainer", "Guard", "Other"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LabourPage() {
  const { data: serverLabours, isLoading: loading, refetch: fetchData } = useBusinessLabour();
  const [labours, setLabours] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Bulk attendance state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);

  // Sync server data to local state for optimistic updates
  useEffect(() => {
    if (serverLabours) {
      setLabours(serverLabours);
    }
  }, [serverLabours]);

  // Add Labour Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLabour, setNewLabour] = useState({ name: "", role: "Staff", salary: 0, phone: "" });
  const [customRole, setCustomRole] = useState("");

  // Vehicle management state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showVehicleSection, setShowVehicleSection] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ ownerName: "", vehicleNumber: "" });
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  // Fetch vehicles
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/business/vehicles", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setVehicles(Array.isArray(json?.data) ? json.data : []);
      }
    } catch { /* silent */ }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.ownerName.trim() || !newVehicle.vehicleNumber.trim()) {
      return toast.error("Fill all vehicle fields");
    }
    setIsSavingVehicle(true);
    try {
      const res = await fetch("/api/business/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVehicle),
      });
      if (res.status === 409) {
        toast.error("Vehicle number already exists");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast.success("Vehicle added!");
      setNewVehicle({ ownerName: "", vehicleNumber: "" });
      fetchVehicles();
    } catch {
      toast.error("Failed to add vehicle");
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const res = await fetch(`/api/business/vehicles?id=${vehicleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Vehicle deleted");
      setVehicles(prev => prev.filter(v => v._id !== vehicleId));
    } catch {
      toast.error("Failed to delete vehicle");
    }
  };



  const markAttendance = async (staffId: string, status: string) => {
    const today = dateKey(new Date());
    
    // Optimistic Update
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
      const res = await fetch("/api/business/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, records: [{ labourId: staffId, status }] }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Attendance marked");
      fetchData(); // Sync with real data
    } catch {
      toast.error("Failed to mark");
      setLabours(previousLabours); // Rollback
    }
  };

  const handlePay = async (staffId: string, amount: number) => {
    // Optimistic Update
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
      const res = await fetch(`/api/business/labour/${staffId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment recorded");
      fetchData(); // Sync
    } catch {
      toast.error("Failed to record payment");
      setLabours(previousLabours); // Rollback
    }
  };

        const handleAdvance = async (staffId: string, amount: number) => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Optimistic Update
    const previousLabours = [...labours];
    setLabours(prev => prev.map(l => {
      if (l._id === staffId) {
        return { ...l, advancePaid: amount };
      }
      return l;
    }));

    try {
      const res = await fetch("/api/business/labour/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, month, amount }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Advance updated");
      fetchData(); // Sync
    } catch {
      toast.error("Failed to update advance");
      setLabours(previousLabours); // Rollback
    }
  };

  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    const role = newLabour.role === "Other" ? customRole : newLabour.role;
    if (!newLabour.name || !role || !newLabour.salary) return toast.error("Fill all fields");

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

    const earnedThisMonth = (present * staff.salary) + (half_day * 0.5 * staff.salary);
    
    // Lifetime stats for Due
    let totalPresent = 0, totalHalf = 0;
    attendance.forEach((a: any) => {
      if (a.status === "present") totalPresent++;
      else if (a.status === "half_day") totalHalf++;
    });

    const lifetimeEarned = (totalPresent * staff.salary) + (totalHalf * 0.5 * staff.salary);
    const totalPaid = (staff.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
    
    return { present, earned: earnedThisMonth, totalPaid, due: lifetimeEarned - totalPaid };
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
      totalAdvance += (staff.advancePaid || 0);
      
      const hasToday = (staff.recentAttendance || []).find((a: any) => dateKey(new Date(a.date)) === today && a.status === 'present');
      if (hasToday) presentToday++;

      // Simple paid this month (can be refined if needed)
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
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Workforce</h1>
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

        {/* Summary */}
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
                // Optimistic update
                const prev = [...labours];
                setLabours(l => l.map(s => ids.includes(s._id) ? {
                  ...s,
                  recentAttendance: [
                    ...(s.recentAttendance || []).filter((a: any) => dateKey(new Date(a.date)) !== today),
                    { date: new Date().toISOString(), status: "present" }
                  ]
                } : s));
                try {
                  const res = await fetch("/api/business/attendance", {
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

        {/* List Header */}
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
          <div>₹/Day</div>
          <div>Present</div>
          <div>Earned</div>
          <div>Paid</div>
          <div>Due</div>
          <div>Status</div>
          <div style={{ width: "18px" }} />
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map(staff => {
            const stats = getStats(staff);
            const today = dateKey(new Date());
            const todayStatus = (staff.recentAttendance || []).find((a: any) => dateKey(new Date(a.date)) === today)?.status || null;

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

        {/* Vehicle Management Section */}
        <div style={{ marginTop: "32px" }}>
          <button
            onClick={() => setShowVehicleSection(!showVehicleSection)}
            style={{
              background: "rgba(11, 18, 32, 0.8)",
              border: "1px solid #1f2937",
              borderRadius: "14px",
              padding: "14px 20px",
              color: "#f9fafb",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              justifyContent: "space-between",
              transition: "border-color 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Truck size={20} color="#8b5cf6" />
              <span>Vehicle Management</span>
              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>({vehicles.length} vehicles)</span>
            </div>
            <span style={{ color: "#6b7280", fontSize: "18px", transition: "transform 0.2s", transform: showVehicleSection ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </button>

          {showVehicleSection && (
            <div style={{
              marginTop: "12px",
              background: "rgba(11, 18, 32, 0.8)",
              border: "1px solid #1f2937",
              borderRadius: "16px",
              padding: "20px",
            }}>
              {/* Add Vehicle Form */}
              <form onSubmit={handleAddVehicle} style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <input
                  required
                  placeholder="Vehicle Owner / Name"
                  value={newVehicle.ownerName}
                  onChange={e => setNewVehicle({ ...newVehicle, ownerName: e.target.value })}
                  style={{ flex: "1 1 180px", background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff", outline: "none" }}
                />
                <input
                  required
                  placeholder="Vehicle Number (e.g. TG08V4944)"
                  value={newVehicle.vehicleNumber}
                  onChange={e => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value })}
                  style={{ flex: "1 1 180px", background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff", outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  style={{
                    background: "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px 20px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={16} /> {isSavingVehicle ? "Adding..." : "Add Vehicle"}
                </button>
              </form>

              {/* Vehicle List */}
              {vehicles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#6b7280", fontSize: "13px" }}>
                  No vehicles added yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {vehicles.map((v: any) => (
                    <div
                      key={v._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "#020617",
                        border: "1px solid #1f2937",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        transition: "border-color 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "10px",
                          background: "#8b5cf615", color: "#8b5cf6",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Truck size={18} />
                        </div>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#f9fafb", margin: 0 }}>{v.vehicleNumber}</p>
                          <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0" }}>{v.ownerName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteVehicle(v._id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6b7280",
                          cursor: "pointer",
                          padding: "6px",
                          borderRadius: "8px",
                          transition: "color 0.2s, background 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#ef444415'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
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
                <input required type="number" placeholder="Salary/Day" value={newLabour.salary || ""} onChange={e => setNewLabour({...newLabour, salary: Number(e.target.value)})} style={{ flex: 1, background: "#020617", border: "1px solid #1f2937", padding: "12px", borderRadius: "10px", color: "#fff" }} />
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
