import React, { useEffect, useState } from 'react';
import { Api } from '../services/api';
import { Client } from '../types';
import { Building2, Plus, Trash2 } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [suburbsList, setSuburbsList] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
    loadSuburbs();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await Api.getClients();
      if (res.success) setClients(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSuburbs = async () => {
    try {
      const res = await Api.getSuburbs();
      if (res.success) setSuburbsList(res.suburbs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await Api.createClient({
        name: name.trim(),
        suburbs: selectedSuburbs.length > 0 ? selectedSuburbs : suburbsList,
        contactEmail: contactEmail.trim()
      });

      setName('');
      setContactEmail('');
      setSelectedSuburbs([]);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    }
  };

  const handleDeleteClient = async (id: string, clientName: string) => {
    if (!window.confirm(`Delete client "${clientName}"?`)) return;
    try {
      await Api.deleteClient(id || clientName);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '24px' }}>Council Clients &amp; Authorities</h2>
        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          Manage local governments and road authorities commissioning sign maintenance audits
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: '20px' }}>
        {/* Add Client Form */}
        <form onSubmit={handleCreateClient} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Building2 size={18} style={{ color: 'var(--clay)' }} />
            <h3 style={{ fontSize: '18px' }}>Add Client Authority</h3>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Client Name
            </label>
            <input
              type="text"
              placeholder="e.g. City of Greater Geelong"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Official Contact Email
            </label>
            <input
              type="email"
              placeholder="signs@geelongcity.vic.gov.au"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Assigned Suburbs
            </label>
            <select
              multiple
              value={selectedSuburbs}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                setSelectedSuburbs(opts);
              }}
              style={{ width: '100%', height: '110px' }}
            >
              {suburbsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '4px' }}>
              Leave empty to automatically assign all {suburbsList.length} Victorian suburbs.
            </div>
          </div>

          <button type="submit" className="btn btn-sm" style={{ gap: '6px', alignSelf: 'flex-start', marginTop: '4px' }}>
            <Plus size={15} />
            <span>Add Client</span>
          </button>
        </form>

        {/* Clients Directory Table */}
        <div className="card">
          <h3 style={{ fontSize: '18px', marginBottom: '14px' }}>Registered Clients</h3>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Client Authority</th>
                  <th>Suburbs Covered</th>
                  <th>Total Reports</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                      Loading clients...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--mute)' }}>
                      No clients registered.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c._id || c.name}>
                      <td style={{ fontWeight: 600 }}>
                        {c.name}
                        {c.contactEmail && (
                          <div style={{ fontSize: '11px', color: 'var(--mute)', fontWeight: 400 }}>
                            {c.contactEmail}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-clay">{c.suburbs?.length || 0} suburbs</span>
                      </td>
                      <td>
                        <span className="badge badge-green">{c.reportsCount || 0} reports</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteClient(c._id || '', c.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: 'var(--red)' }}
                          title="Delete Client"
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
