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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password state
  const [forgotView, setForgotView] = useState<'none' | 'request' | 'reset'>('none');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isFirstSetup) {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const res = await Api.setupAdmin({ username, password });
        setAuthToken(res.token);
        onLoginSuccess(res.user);
        return;
      }

      if (!username.trim() || !password) {
        throw new Error('Please enter username and password');
      }

      const res = await Api.login(username.trim(), password);

      if (res.user.role !== 'leader' && res.user.role !== 'admin') {
        throw new Error('Access denied. People Leader privileges required for this portal.');
      }

      setAuthToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        setIsFirstSetup(true);
      }
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!resetIdentifier.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    setLoading(true);
    try {
      const res = await Api.forgotPassword(resetIdentifier.trim());
      setSuccessMsg(res.message);
      if (res.devResetCode) {
        setResetCode(res.devResetCode);
      }
      setForgotView('reset');
    } catch (err: any) {
      setError(err.message || 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!resetCode.trim()) {
      setError('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await Api.resetPassword(resetIdentifier.trim(), resetCode.trim(), newPassword);
      setSuccessMsg(res.message);
      setForgotView('none');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset code.');
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
        aria-label="Toggle theme"
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
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        ◐
      </button>

      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <svg width="84" height="84" viewBox="0 0 64 64" aria-label="i-Sign" style={{ borderRadius: '16px', marginBottom: '12px' }}>
          <rect width="64" height="64" rx="13" fill="#D97757" />
          <rect x="14" y="14" width="36" height="36" rx="6" transform="rotate(45 32 32)" fill="#F5F4ED" />
          <circle cx="32" cy="22.5" r="3.2" fill="#C15F3C" />
          <rect x="29.2" y="28.5" width="5.6" height="13" rx="2.8" fill="#C15F3C" />
        </svg>

        <h1 style={{ fontSize: '40px', marginBottom: '4px', fontWeight: 400 }}>
          i-<span style={{ color: 'var(--clay)' }}>Sign</span>
        </h1>
        <p style={{ color: 'var(--mute)', fontSize: '15px' }}>
          Parking &amp; Road Sign Data – People Leaders
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '390px', padding: '28px' }}>
        {isFirstSetup && forgotView === 'none' && (
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
            First-time setup: Create the primary administrator account for i-Sign.
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

        {successMsg && (
          <div
            style={{
              backgroundColor: 'var(--green-bg)',
              color: 'var(--green)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              marginBottom: '16px'
            }}
          >
            {successMsg}
          </div>
        )}

        {forgotView === 'request' && (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px' }}>Forgot password</h3>
            <p style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Enter your username or email to receive a 6-digit reset code.
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Username or Email
              </label>
              <input
                type="text"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                placeholder="Enter username or email"
                autoCapitalize="none"
                required
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotView('none');
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--clay)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Back to Sign in
            </button>
          </form>
        )}

        {forgotView === 'reset' && (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '18px' }}>Reset password</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                6-digit Reset Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="e.g. 123456"
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm password"
                required
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotView('none');
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--clay)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Back to Sign in
            </button>
          </form>
        )}

        {forgotView === 'none' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter people leader username"
                autoCapitalize="none"
                autoComplete="username"
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
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={{ width: '100%' }}
              />
            </div>

            {isFirstSetup && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: '6px' }}>
              {loading ? 'Signing in...' : isFirstSetup ? 'Create Account & Sign In' : 'Sign in as People Leader'}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetIdentifier(username.trim());
                setError(null);
                setSuccessMsg(null);
                setForgotView('request');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--clay)',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '2px'
              }}
            >
              Forgot password?
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
