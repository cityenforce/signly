import React, { useEffect, useState } from 'react';
import { Api } from '../services/api';
import { Download, Search, RotateCcw, Trash2, Eye } from 'lucide-react';
import { Report } from '../types';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [suburb, setSuburb] = useState('');
  const [condition, setCondition] = useState('');
  const [search, setSearch] = useState('');
  const [suburbsList, setSuburbsList] = useState<string[]>([]);

  useEffect(() => {
    loadSuburbs();
    loadReports();
  }, []);

  const loadSuburbs = async () => {
    try {
      const res = await Api.getSuburbs();
      if (res.success) {
        setSuburbsList(res.suburbs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await Api.getReports({
        fromDate,
        toDate,
        suburb,
        condition,
        search
      });
      if (res.success) {
        setReports(res.data);
        setTotalCount(res.total);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setSuburb('');
    setCondition('');
    setSearch('');
    setTimeout(() => {
      Api.getReports({}).then((res) => {
        if (res.success) {
          setReports(res.data);
          setTotalCount(res.total);
        }
      });
    }, 50);
  };

  const handleDeleteReport = async (ref: string) => {
    if (!window.confirm(`Are you sure you want to delete report ${ref}?`)) return;
    try {
      await Api.deleteReport(ref);
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const handleExportCsv = () => {
    const url = Api.getExportCsvUrl({
      fromDate,
      toDate,
      suburb,
      condition,
      search
    });
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px' }}>Sign Inspection Reports</h2>
          <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
            Filter, inspect, and export parking restriction and road sign survey records
          </p>
        </div>

        <button onClick={handleExportCsv} className="btn" style={{ gap: '8px' }}>
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Card */}
      <form onSubmit={handleApplyFilter} className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Suburb
            </label>
            <select value={suburb} onChange={(e) => setSuburb(e.target.value)} style={{ width: '100%' }}>
              <option value="">All suburbs</option>
              {suburbsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Sign Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All conditions</option>
              <option value="1P">1P</option>
              <option value="1P Meter">1P Meter</option>
              <option value="2P">2P</option>
              <option value="2P Meter">2P Meter</option>
              <option value="No Stopping">No Stopping</option>
              <option value="No Parking">No Parking</option>
              <option value="Loading Zone">Loading Zone</option>
              <option value="Disabled Parking">Disabled Parking</option>
              <option value="Speed Limit">Speed Limit</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
              Search Ref / Street
            </label>
            <input
              type="text"
              placeholder="e.g. Ryrie or 261122"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
          <button type="button" onClick={handleClearFilters} className="btn btn-secondary btn-sm">
            <RotateCcw size={14} />
            <span>Clear</span>
          </button>
          <button type="submit" className="btn btn-sm">
            <Search size={14} />
            <span>Filter</span>
          </button>
        </div>
      </form>

      {/* Result Count Banner */}
      <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
        Showing <b>{reports.length}</b> of <b>{totalCount}</b> reports
      </div>

      {/* Reports Table */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Ref</th>
              <th>Officer</th>
              <th>Client</th>
              <th>Location</th>
              <th>Area</th>
              <th>Signs</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--mute)' }}>
                  Loading reports...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--mute)' }}>
                  No reports matched your search criteria.
                </td>
              </tr>
            ) : (
              reports.map((r) => {
                const dateStr = (r.submitted || r.created || '').slice(0, 10);
                const conditionsSummary = (r.signs || [])
                  .flatMap((s) => s.conds.map((c) => c.rule))
                  .join(', ');

                return (
                  <tr key={r.ref}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateStr}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.ref}</td>
                    <td>
                      <div>{(r.officer && r.officer.name) || 'Unassigned'}</div>
                      {r.officer?.no && (
                        <div style={{ fontSize: '11px', color: 'var(--mute)' }}>#{r.officer.no}</div>
                      )}
                    </td>
                    <td>{r.client}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {r.suburb} — {r.street}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--mute)' }}>
                        {r.from && r.to ? `Btwn ${r.from} & ${r.to} (${r.side || 'N/A'})` : r.address || ''}
                      </div>
                    </td>
                    <td>
                      {r.areaCode ? (
                        <span className="badge badge-clay">{r.areaCode}</span>
                      ) : (
                        <span style={{ color: 'var(--mute)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-green" title={conditionsSummary}>
                        {r.signs?.length || 0} sign{(r.signs?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="btn btn-secondary btn-sm"
                          title="View Details"
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(r.ref)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', color: 'var(--red)' }}
                          title="Delete Report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px' }}>Report: {selectedReport.ref}</h3>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <b>Sign Code:</b> {selectedReport.code || selectedReport.signCode}
              </div>
              <div>
                <b>Client:</b> {selectedReport.client}
              </div>
              <div>
                <b>Location:</b> {selectedReport.address ? `${selectedReport.address}, ` : ''}
                {selectedReport.street}, {selectedReport.suburb}
              </div>
              {selectedReport.gps && (
                <div>
                  <b>GPS:</b> {selectedReport.gps}
                </div>
              )}
              {selectedReport.notes && (
                <div>
                  <b>Field Notes:</b> {selectedReport.notes}
                </div>
              )}

              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <b>Site &amp; Sign Photos:</b>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {selectedReport.photos.map((photoUrl, pIdx) => (
                      <a
                        key={pIdx}
                        href={photoUrl.startsWith('http') ? photoUrl : `http://localhost:5000${photoUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}
                      >
                        <img
                          src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:5000${photoUrl}`}
                          alt={`Sign Photo ${pIdx + 1}`}
                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <b>Sign Details &amp; Conditions:</b>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {selectedReport.signs.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--card-subtle)',
                        border: '1px solid var(--line)'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        Sign {idx + 1}: {s.type}
                      </div>
                      {s.conds.map((c, cIdx) => (
                        <div key={cIdx} style={{ fontSize: '13px', color: 'var(--mute)' }}>
                          • {c.rule} {c.speed ? `(${c.speed} km/h)` : ''} | Arrow: {c.arrow} | Days: {c.day} | Times: {c.time}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedReport(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

