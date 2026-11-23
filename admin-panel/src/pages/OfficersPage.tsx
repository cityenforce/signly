import React, { useEffect, useState } from 'react';
import { Api } from '../services/api';
import { User } from '../types';
import { UserPlus, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export const OfficersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [officerNo, setOfficerNo] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      setLoading(true);
      const res = await Api.getUsers();
      if (res.success) setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;

    try {
      await Api.createUser({
        name: name.trim(),
        officerNo: officerNo.trim() || undefined,
        username: username.trim().toLowerCase(),
        password: password.trim(),
        email: email.trim().toLowerCase() || `${username.trim().toLowerCase()}@signly.vic.gov.au`,
        role: 'officer'
      });

      setName('');
      setOfficerNo('');
      setUsername('');
      setPassword('');
      setEmail('');
      loadOfficers();
    } catch (err: any) {
      alert(err.message || 'Failed to create officer account');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await Api.updateUser(user._id, { isActive: !user.isActive });
      loadOfficers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!window.confirm(`Delete user account "${userName}"?`)) return;
    try {
      await Api.deleteUser(id);
      loadOfficers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '24px' }}>Field Officers &amp; Staff Directory</h2>
        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          Onboard, configure credentials, and manage sign inspection personnel
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '20px' }}>
        {/* Onboard Officer Form */}
        <form onSubmit={handleCreateOfficer} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <UserPlus size={18} style={{ color: 'var(--clay)' }} />
            <h3 style={{ fontSize: '18px' }}>Onboard Field Officer</h3>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Nguyen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Badge / Officer Number
            </label>
            <input
              type="text"
              placeholder="e.g. 1042"
              value={officerNo}
              onChange={(e) => setOfficerNo(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Username
            </label>
            <input
              type="text"
              placeholder="e.g. sarah.nguyen"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Temporary Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Official Email
            </label>
            <input
              type="email"
              placeholder="sarah.nguyen@signly.vic.gov.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button type="submit" className="btn btn-sm" style={{ gap: '6px', alignSelf: 'flex-start', marginTop: '6px' }}>
            <UserPlus size={15} />
            <span>Create Officer</span>
          </button>
        </form>

        {/* Officers Directory Table */}
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '14px' }}>Staff Accounts</h3>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Badge No</th>
                  <th>Role</th>
                  <th>Audits Done</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                      Loading officers...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                      No personnel accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--card-subtle)',
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '13px'
                              }}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--mute)' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{u.officerNo || '—'}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-clay'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Officer'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-green">{u.reportsCount || 0}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: u.isActive ? 'var(--green)' : 'var(--red)'
                          }}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 size={14} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: 'var(--red)' }}
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
