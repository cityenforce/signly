import React, { useEffect, useState } from 'react';
import { Api } from '../services/api';
import { User } from '../types';
import { Users, CheckCircle2, XCircle } from 'lucide-react';

export const OfficersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px' }}>Officers</h2>
        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          Officer logins are created and managed in <b>Admin Control</b> (bottom of the sign-in page in the i-Sign app).
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Users size={18} style={{ color: 'var(--clay)' }} />
          <h3 style={{ fontSize: '18px' }}>Field Officers ({users.filter((u) => u.role === 'officer').length})</h3>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>No.</th>
                <th>Username</th>
                <th>Status</th>
                <th>Reports</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                    Loading officers...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                    No officers yet
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
                          <div style={{ fontSize: '11px', color: 'var(--mute)' }}>
                            {u.role === 'admin' ? 'Admin' : u.role === 'leader' ? 'People Leader' : 'Officer'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{u.officerNo || '–'}</td>
                    <td>{u.username || '–'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: u.isActive ? 'var(--green)' : 'var(--red)'
                        }}
                      >
                        {u.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{u.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">{u.reportsCount || 0}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
