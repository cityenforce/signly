import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, subtext, icon }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: 'var(--clay)' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-serif)' }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: '12px', color: 'var(--mute)' }}>{subtext}</div>}
    </div>
  );
};

