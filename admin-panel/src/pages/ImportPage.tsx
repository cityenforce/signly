import React, { useState, useEffect } from 'react';
import { Api } from '../services/api';
import { User } from '../types';
import { Upload, Database, Trash2, CheckCircle2 } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [jsonText, setJsonText] = useState('');
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedOfficerNo, setSelectedOfficerNo] = useState('');
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    Api.getUsers('officer').then((res) => {
      if (res.success) setOfficers(res.data);
    });
  }, []);

  const handleImportJson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) return;

    try {
      setImporting(true);
      let parsed;
      try {
        parsed = JSON.parse(jsonText.trim());
      } catch {
        throw new Error('Invalid JSON format. Please paste a valid JSON object or array.');
      }

      const assignedOfficer = officers.find((o) => o.officerNo === selectedOfficerNo);
      const officerObj = assignedOfficer
        ? { name: assignedOfficer.name, no: assignedOfficer.officerNo || '' }
        : undefined;

      const res = await Api.importReports(parsed, officerObj);
      setStatusMessage(res.message);
      setJsonText('');
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await Api.seedDemoData();
      setStatusMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  const handleRemoveDemo = async () => {
    if (!window.confirm('Are you sure you want to remove all demo reports?')) return;
    try {
      const res = await Api.removeDemoData();
      setStatusMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to remove demo data');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '24px' }}>Import Reports &amp; Demo Testing Data</h2>
        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          Batch import offline field audits from the i-Sign app or populate Geelong simulation data
        </p>
      </div>

      {statusMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: 'var(--green-bg)',
            color: 'var(--green)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500
          }}
        >
          <CheckCircle2 size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* JSON Import Section */}
      <form onSubmit={handleImportJson} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} style={{ color: 'var(--clay)' }} />
          <h3 style={{ fontSize: '18px' }}>Import Reports from Mobile App</h3>
        </div>

        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          In the i-Sign Android application, open any submitted report, expand the <b>“Backend record (JSON)”</b>{' '}
          drawer, copy the JSON string, and paste it below. You can also paste an array of report objects.
        </p>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
            Attribute to Field Officer
          </label>
          <select
            value={selectedOfficerNo}
            onChange={(e) => setSelectedOfficerNo(e.target.value)}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            <option value="">Keep officer from JSON payload</option>
            {officers.map((o) => (
              <option key={o.officerNo || o._id} value={o.officerNo || ''}>
                {o.name} (#{o.officerNo || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
            JSON Record Payload
          </label>
          <textarea
            rows={7}
            placeholder='{ "ref": "261122TEST01", "client": "City of Greater Geelong", ... }'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            required
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <button type="submit" className="btn btn-sm" disabled={importing} style={{ gap: '6px', alignSelf: 'flex-start' }}>
          <Upload size={15} />
          <span>{importing ? 'Importing...' : 'Import Records'}</span>
        </button>
      </form>

      {/* Demo Simulation Suite */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: 'var(--clay)' }} />
          <h3 style={{ fontSize: '18px' }}>Geelong Demo Dataset</h3>
        </div>

        <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
          Seeds 3 sample field officers (Sarah Nguyen #1042, Mark Taylor #1057, Priya Shah #1063) and 40
          GPS-tagged Victorian parking sign reports across Central Geelong streets to test maps, coverage, and
          filters.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <button onClick={handleSeedDemo} className="btn btn-sm" disabled={seeding} style={{ gap: '6px' }}>
            <Database size={15} />
            <span>{seeding ? 'Seeding...' : 'Load Demo Data'}</span>
          </button>

          <button onClick={handleRemoveDemo} className="btn btn-secondary btn-sm" style={{ gap: '6px', color: 'var(--red)' }}>
            <Trash2 size={15} />
            <span>Remove Demo Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};
