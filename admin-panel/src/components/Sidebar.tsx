import React from 'react';
import { Home, FileText, Map, Building2, Users, Database } from 'lucide-react';

export type AdminTab = 'home' | 'reports' | 'map' | 'clients' | 'officers' | 'import';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems: { tab: AdminTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'home', label: 'Dashboard', icon: <Home size={18} /> },
    { tab: 'reports', label: 'Reports', icon: <FileText size={18} /> },
    { tab: 'map', label: 'Map & Areas', icon: <Map size={18} /> },
    { tab: 'clients', label: 'Clients', icon: <Building2 size={18} /> },
    { tab: 'officers', label: 'Officers', icon: <Users size={18} /> },
    { tab: 'import', label: 'Import & Demo', icon: <Database size={18} /> }
  ];

  return (
    <aside
      style={{
        width: '230px',
        backgroundColor: 'var(--card)',
        borderRight: '1px solid var(--line)',
        minHeight: 'calc(100vh - 65px)',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      <div style={{ padding: '0 12px 12px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, letterSpacing: '0.05em' }}>
        Administration
      </div>

      {navItems.map((item) => {
        const isActive = currentTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => onSelectTab(item.tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isActive ? 'var(--clay-light)' : 'transparent',
              color: isActive ? 'var(--clay)' : 'var(--ink)',
              fontWeight: isActive ? 600 : 400,
              fontSize: '14px',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span style={{ color: isActive ? 'var(--clay)' : 'var(--mute)' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};

