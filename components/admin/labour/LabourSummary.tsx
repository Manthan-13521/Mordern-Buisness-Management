import React from 'react';
import { Users, UserCheck, Wallet, IndianRupee } from 'lucide-react';

interface LabourSummaryProps {
  totalStaff: number;
  presentToday: number;
  totalPaid: number;
  totalDue: number;
}

export const LabourSummary: React.FC<LabourSummaryProps> = ({
  totalStaff,
  presentToday,
  totalPaid,
  totalDue
}) => {
  const cards = [
    { label: 'Total Staff', value: totalStaff, icon: <Users size={20} />, color: '#8b5cf6', bg: '#8b5cf615' },
    { label: 'Present Today', value: presentToday, icon: <UserCheck size={20} />, color: '#10b981', bg: '#10b98115' },
    { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, icon: <Wallet size={20} />, color: '#3b82f6', bg: '#3b82f615' },
    { label: 'Total Due', value: `₹${totalDue.toLocaleString()}`, icon: <IndianRupee size={20} />, color: '#f43f5e', bg: '#f43f5e15' },
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '16px', 
      marginBottom: '24px' 
    }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: 'rgba(11, 18, 32, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          border: '1px solid #1f2937',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'transform 0.2s ease, border-color 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = card.color + '40';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = '#1f2937';
        }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: card.bg,
            color: card.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {card.icon}
          </div>
          <div>
            <p style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              color: '#9ca3af', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              margin: 0 
            }}>{card.label}</p>
            <p style={{ 
              fontSize: '22px', 
              fontWeight: 800, 
              color: '#f9fafb', 
              margin: '2px 0 0' 
            }}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
