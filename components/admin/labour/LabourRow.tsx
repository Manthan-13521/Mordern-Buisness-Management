import React, { useState, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AttendanceActions } from './AttendanceActions';
import { useLabourSummary } from '@/hooks/useAnalytics';

interface MonthlySummary {
  month: string;
  year: number;
  presentDays: number;
  halfDays: number;
  earned: number;
  paid: number;
  status: "CLEARED" | "DUE";
  dueAmount: number;
  advanceAmount?: number;
}

interface LabourRowProps {
  staff: any;
  stats: any;
  todayStatus: any;
  onMarkAttendance: (status: string) => void;
  onPay: (amount: number) => Promise<void>;
  onUpdateAdvance: (amount: number) => Promise<void>;
  isExpanded: boolean;
  onToggle: () => void;
  unit?: string;
  type?: 'business' | 'pool' | 'hostel';
  slug?: string;
}

export const LabourRow: React.FC<LabourRowProps> = ({
  staff,
  stats,
  todayStatus,
  onMarkAttendance,
  onPay,
  onUpdateAdvance,
  isExpanded,
  onToggle,
  unit = "d",
  type = "business",
  slug
}) => {
  const [payAmount, setPayAmount] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [newAdvance, setNewAdvance] = useState<string>(String(staff.advancePaid || 0));
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  
  // Lazy-loaded 3-month summary via React Query
  // Automatically fetches only when isExpanded is true
  const { data, isLoading: summaryLoading, isError: summaryError, refetch } = useLabourSummary(isExpanded ? staff._id : "", type, slug);
  const monthlySummary = data?.months || null;

  const handlePay = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0 || isPaying) return;
    
    setIsPaying(true);
    try {
      await onPay(amt);
      setPayAmount('');
      // Refresh summary after payment
      refetch();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpdateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAdvance);
    if (isNaN(amt) || isSavingAdvance) return;

    setIsSavingAdvance(true);
    try {
      await onUpdateAdvance(amt);
      setShowAdvanceModal(false);
    } finally {
      setIsSavingAdvance(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePay(e);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase() === 'paid') return '#10b981';
    if (status.toLowerCase() === 'overpaid') return '#f59e0b';
    if (status.toLowerCase() === 'partial') return '#f59e0b';
    return '#f43f5e';
  };

  const status = stats.due === 0 ? (stats.advance > 0 ? 'Overpaid' : 'Paid') : stats.totalPaid > 0 ? 'Partial' : 'Due';

  return (
    <div style={{
      background: 'rgba(11, 18, 32, 0.6)',
      borderRadius: '12px',
      border: '1px solid #1f2937',
      marginBottom: '10px',
      overflow: 'hidden',
      transition: 'all 0.2s ease'
    }}>
      {/* Main Row — improved height & spacing */}
      <div 
        onClick={onToggle}
        style={{
          padding: '16px 16px',
          minHeight: '68px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr auto',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(31, 41, 55, 0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#8b5cf620',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 800,
            border: '1px solid #8b5cf630',
            flexShrink: 0
          }}>
            {staff.name[0]?.toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, color: '#f9fafb', fontSize: '15px' }}>{staff.name}</span>
        </div>

        {/* Salary/Unit */}
        <div style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>
          ₹{staff.salary}<span style={{ fontSize: '11px', opacity: 0.6 }}>/{unit}</span>
        </div>

        {/* Present Days */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>
          {stats.present}d
        </div>

        {/* Earned */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f9fafb' }}>
          ₹{stats.earned.toLocaleString()}
        </div>

        {/* Paid */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6' }}>
          ₹{stats.totalPaid.toLocaleString()}
        </div>

        {/* Due */}
        <div style={{ fontSize: '15px', fontWeight: 800, color: stats.due > 0 ? '#f43f5e' : '#10b981' }}>
          ₹{stats.due.toLocaleString()}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: getStatusColor(status), textTransform: 'uppercase' }}>{status}</span>
        </div>

        {/* Expand Toggle */}
        <div style={{ color: '#6b7280' }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Advance Edit Modal */}
      {showAdvanceModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => setShowAdvanceModal(false)} />
          <div style={{ position: "relative", background: "#0b1220", borderRadius: "16px", width: "100%", maxWidth: "320px", border: "1px solid #1f2937", padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>Update Advance</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#9ca3af" }}>Enter advance amount for {staff.name} this month.</p>
            <form onSubmit={handleUpdateAdvance} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>₹</span>
                <input
                  required
                  type="number"
                  autoFocus
                  value={newAdvance}
                  onChange={e => setNewAdvance(e.target.value)}
                  style={{ width: "100%", background: "#020617", border: "1px solid #1f2937", padding: "12px 12px 12px 28px", borderRadius: "10px", color: "#fff", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setShowAdvanceModal(false)} style={{ flex: 1, background: "transparent", border: "1px solid #1f2937", color: "#9ca3af", borderRadius: "10px", padding: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSavingAdvance} style={{ flex: 1, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, cursor: "pointer" }}>
                  {isSavingAdvance ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expanded Section */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid #1f2937',
          background: 'rgba(2, 6, 23, 0.4)',
        }}>
          {/* Actions Row: Attendance + Pay */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Mark Attendance:</span>
                  <AttendanceActions 
                    status={todayStatus} 
                    onMark={onMarkAttendance} 
                  />
                </div>
                {/* Advance Display Below Attendance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Advance:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>₹{staff.advancePaid || 0}</span>
                  <button 
                    onClick={() => setShowAdvanceModal(true)}
                    style={{ background: 'transparent', border: 'none', color: '#8b5cf6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '12px' }}>₹</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: '100px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    padding: '8px 8px 8px 24px',
                    fontSize: '13px',
                    color: '#f9fafb',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={handlePay}
                disabled={isPaying || !payAmount}
                style={{
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: (isPaying || !payAmount) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (isPaying || !payAmount) ? 0.6 : 1
                }}
              >
                {isPaying ? '...' : <><Send size={14} /> Pay</>}
              </button>
            </div>
          </div>

          {/* Last 3 Months Summary — lazy loaded */}
          <div style={{
            padding: '0 20px 20px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}>
              Last 3 Months
            </div>

            {summaryLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: '#6b7280' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Loading summary...</span>
              </div>
            )}

            {summaryError && (
              <div style={{ fontSize: '13px', color: '#f43f5e', padding: '8px 0' }}>
                Failed to load summary.{' '}
                <span
                  onClick={() => refetch()}
                  style={{ color: '#8b5cf6', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Retry
                </span>
              </div>
            )}

            {monthlySummary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 80px 90px 90px 100px',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  <div>Month</div>
                  <div>Days</div>
                  <div>Earned</div>
                  <div>Paid</div>
                  <div>Status</div>
                </div>

                {monthlySummary.map((m: MonthlySummary, idx: number) => (
                  <div
                    key={`${m.month}-${m.year}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 80px 90px 90px 100px',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    {/* Month */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#d1d5db' }}>
                      {m.month}
                    </div>

                    {/* Days */}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#e5e7eb' }}>
                      {m.presentDays}{m.halfDays > 0 ? <span style={{ fontSize: '11px', color: '#9ca3af' }}> +{m.halfDays}½</span> : ''} days
                    </div>

                    {/* Earned */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>
                      ₹{m.earned.toLocaleString()}
                    </div>

                    {/* Paid */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>
                      ₹{m.paid.toLocaleString()}
                    </div>

                    {/* Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: m.status === 'CLEARED' ? '#10b981' : '#f43f5e',
                        letterSpacing: '0.3px',
                      }}>
                        {m.status}
                      </span>
                      {m.status === 'DUE' && m.dueAmount > 0 && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#f43f5e',
                        }}>
                          ₹{m.dueAmount.toLocaleString()}
                        </span>
                      )}
                      {m.status === 'CLEARED' && (m.advanceAmount || 0) > 0 && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#f59e0b',
                        }}>
                          +₹{(m.advanceAmount || 0).toLocaleString()} adv
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
