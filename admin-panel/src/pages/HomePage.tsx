import React, { useEffect, useState } from 'react';
import { Api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { FileText, MapPin, Map, Users, ArrowRight } from 'lucide-react';
import { DashboardStats, BreakdownItem } from '../types';

interface HomePageProps {
  onNavigateTab: (tab: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bySuburb, setBySuburb] = useState<BreakdownItem[]>([]);
  const [byOfficer, setByOfficer] = useState<BreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await Api.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
        setBySuburb(res.breakdowns.bySuburb || []);
        setByOfficer(res.breakdowns.byOfficer || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Welcome */}
      <div style={{ textAlign: 'center', padding: '24px 0 8px 0' }}>
        <svg width="72" height="72" viewBox="0 0 100 100" style={{ borderRadius: '16px', marginBottom: '8px' }}>
          <rect width="100" height="100" rx="22" fill="#D97757" />
          <line x1="50" y1="58" x2="50" y2="84" stroke="#F5F4ED" strokeWidth="5" strokeLinecap="round" />
          <polygon points="50,18 78,46 50,74 22,46" fill="#F5F4ED" stroke="#141413" strokeWidth="3" />
          <text
            x="50"
            y="54"
            fontFamily="'Newsreader', Georgia, serif"
            fontSize="32"
            fontWeight="bold"
            fill="#141413"
            textAnchor="middle"
          >
            e
          </text>
        </svg>

        <h1 style={{ fontSize: '36px', fontWeight: 500 }}>
          e<span style={{ color: 'var(--clay)' }}>Signs</span> Administration
        </h1>
        <p style={{ color: 'var(--mute)', fontSize: '15px' }}>
          Victorian AS 1742.11 sign data collection &amp; maintenance oversight
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-kpi">
        <KpiCard
          label="Total Reports"
          value={loading ? '...' : stats?.totalReports ?? 0}
          subtext="Audited signs in Victoria"
          icon={<FileText size={20} />}
        />
        <KpiCard
          label="Suburbs Covered"
          value={loading ? '...' : stats?.suburbsCovered ?? 0}
          subtext="Greater Geelong & surrounding"
          icon={<MapPin size={20} />}
        />
        <KpiCard
          label="Areas Defined"
          value={loading ? '...' : stats?.areasDefined ?? 0}
          subtext="5-digit zoning sectors"
          icon={<Map size={20} />}
        />
        <KpiCard
          label="Active Officers"
          value={loading ? '...' : stats?.activeOfficers ?? 0}
          subtext="Field collection personnel"
          icon={<Users size={20} />}
        />
      </div>

      {/* Breakdown Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Reports by Suburb */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px' }}>Reports by Suburb</h3>
            <button
              onClick={() => onNavigateTab('reports')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {bySuburb.length === 0 ? (
            <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
              No reports registered yet.{' '}
              <button
                onClick={() => onNavigateTab('import')}
                style={{ background: 'none', border: 'none', color: 'var(--clay)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Load demo data
              </button>{' '}
              to test.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bySuburb.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--card-subtle)'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span className="badge badge-clay">{item.count} reports</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports by Officer */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px' }}>Reports by Officer</h3>
            <button
              onClick={() => onNavigateTab('officers')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>Manage Officers</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {byOfficer.length === 0 ? (
            <p style={{ color: 'var(--mute)', fontSize: '13px' }}>No officers registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {byOfficer.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--card-subtle)'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span className="badge badge-green">{item.count} reports</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

