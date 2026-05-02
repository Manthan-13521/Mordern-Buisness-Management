import React from 'react';
import { Check, X } from 'lucide-react';

interface AttendanceActionsProps {
  status: 'present' | 'absent' | 'half_day' | null;
  onMark: (status: 'present' | 'absent' | 'half_day') => void;
  loading?: boolean;
}

export const AttendanceActions: React.FC<AttendanceActionsProps> = ({
  status,
  onMark,
  loading
}) => {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={(e) => { e.stopPropagation(); onMark('present'); }}
        disabled={loading}
        title="Mark Present"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: status === 'present' ? '1px solid #10b981' : '1px solid #1f2937',
          background: status === 'present' ? '#10b98120' : 'rgba(17, 24, 39, 0.4)',
          color: status === 'present' ? '#10b981' : '#9ca3af',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.borderColor = '#10b981')}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.borderColor = status === 'present' ? '#10b981' : '#1f2937')}
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMark('absent'); }}
        disabled={loading}
        title="Mark Absent"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: status === 'absent' ? '1px solid #f43f5e' : '1px solid #1f2937',
          background: status === 'absent' ? '#f43f5e20' : 'rgba(17, 24, 39, 0.4)',
          color: status === 'absent' ? '#f43f5e' : '#9ca3af',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.borderColor = '#f43f5e')}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.borderColor = status === 'absent' ? '#f43f5e' : '#1f2937')}
      >
        <X size={16} strokeWidth={3} />
      </button>
    </div>
  );
};
