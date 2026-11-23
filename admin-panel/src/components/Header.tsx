import React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  isDark,
  onToggleTheme
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Signly Brand Logo */}
        <svg width="36" height="36" viewBox="0 0 64 64" aria-label="Signly" style={{ borderRadius: '8px' }}>
          <rect width="64" height="64" rx="13" fill="#D97757" />
          <circle cx="32" cy="25" r="19" fill="#F5F4ED" />
          <rect x="29.4" y="42" width="5.3" height="15.4" rx="2.6" fill="#F5F4ED" />
          <path
            d="M41 17.5C37 13.5 23.5 14 24 21C24.5 28 40 24 40 31C40 37.5 27 37 23 32.5"
            fill="none"
            stroke="#C15F3C"
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div>
          <h2 style={{ fontSize: '20px', lineHeight: 1.2 }}>
            Sign<span style={{ color: 'var(--clay)' }}>ly</span>{' '}
            <span style={{ fontSize: '15px', color: 'var(--mute)', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>
              Admin Portal
            </span>
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {currentUser && (
          <div style={{ textAlign: 'right', display: 'none', minWidth: '120px' }}>
            <div style={{ fontWeight: 500, fontSize: '13px' }}>{currentUser.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--mute)' }}>
              {currentUser.role === 'admin' ? 'Administrator' : `Officer #${currentUser.officerNo || ''}`}
            </div>
          </div>
        )}

        <button
          onClick={onToggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink)'
          }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          onClick={onLogout}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
          title="Sign out"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};

