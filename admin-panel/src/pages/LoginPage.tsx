import React, { useState } from 'react';
import { Api, setAuthToken } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDark,
  onToggleTheme
}) => {
  const [mode, setMode] = useState<'user' | 'admin'>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminPassword123!');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isFirstSetup && mode === 'admin') {
        if (password.length < 8) {
          throw new Error('Admin password must be at least 8 characters');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const res = await Api.setupAdmin({
          username,
          password
        });
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        return;
      }

      // Normal Login
      const res = await Api.login(username, password);

      if (mode === 'admin' && res.user.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required for the Admin Portal.');
      }

      setAuthToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      // If admin setup is needed or invalid credentials
      if (err.message && err.message.includes('not found') && mode === 'admin') {
        setIsFirstSetup(true);
      }
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg)',
        position: 'relative'
      }}
    >
      <button
        onClick={onToggleTheme}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
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
      >
        ◐
      </button>

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-label="Signly" style={{ borderRadius: '13px', marginBottom: '12px' }}>
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

        <h1 style={{ fontSize: '36px', marginBottom: '4px' }}>
          Sign<span style={{ color: 'var(--clay)' }}>ly</span>
        </h1>
        <p style={{ color: 'var(--mute)', fontSize: '15px' }}>
          Parking &amp; road sign data collection
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '390px', padding: '28px' }}>
        {/* Role Segment Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('user');
              setIsFirstSetup(false);
              setUsername('sarah.nguyen');
              setPassword('OfficerPass123!');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: mode === 'user' ? 'var(--card)' : 'transparent',
              color: mode === 'user' ? 'var(--ink)' : 'var(--mute)',
              fontWeight: mode === 'user' ? 600 : 400,
              boxShadow: mode === 'user' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setUsername('admin');
              setPassword('AdminPassword123!');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: mode === 'admin' ? 'var(--card)' : 'transparent',
              color: mode === 'admin' ? 'var(--ink)' : 'var(--mute)',
              fontWeight: mode === 'admin' ? 600 : 400,
              boxShadow: mode === 'admin' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Admin
          </button>
        </div>

        {isFirstSetup && mode === 'admin' && (
          <div
            style={{
              backgroundColor: 'var(--clay-light)',
              color: 'var(--clay)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              marginBottom: '16px'
            }}
          >
            First-time setup: Create the primary administrator account for eSigns.
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: 'var(--red-bg)',
              color: 'var(--red)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'admin' ? 'admin' : 'officer.username'}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%' }}
            />
          </div>

          {isFirstSetup && mode === 'admin' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%' }}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading
              ? 'Authenticating...'
              : isFirstSetup && mode === 'admin'
              ? 'Create Admin & Sign in'
              : `Sign in as ${mode === 'admin' ? 'Administrator' : 'Field User'}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => alert('Password reset link sent to your registered email.')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--clay)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
};

