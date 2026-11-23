import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, AdminTab } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ReportsPage } from './pages/ReportsPage';
import { MapPage } from './pages/MapPage';
import { ClientsPage } from './pages/ClientsPage';
import { OfficersPage } from './pages/OfficersPage';
import { ImportPage } from './pages/ImportPage';
import { Api, getAuthToken, clearAuthToken } from './services/api';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<AdminTab>('home');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('signly_theme') === 'dark';
  });
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sync dark theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('signly_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('signly_theme', 'light');
    }
  }, [isDark]);

  // Check initial token
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    Api.getMe()
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
        } else {
          clearAuthToken();
        }
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => {
        setCheckingAuth(false);
      });

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
          color: 'var(--mute)'
        }}
      >
        Authenticating Signly session...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => setCurrentUser(user)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

        <main style={{ flex: 1, padding: '28px 36px', maxWidth: '1400px' }}>
          {currentTab === 'home' && <HomePage onNavigateTab={(tab) => setCurrentTab(tab)} />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'map' && <MapPage />}
          {currentTab === 'clients' && <ClientsPage />}
          {currentTab === 'officers' && <OfficersPage />}
          {currentTab === 'import' && <ImportPage />}
        </main>
      </div>
    </div>
  );
}

