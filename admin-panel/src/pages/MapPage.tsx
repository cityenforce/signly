import React, { useEffect, useState, useRef } from 'react';
import { Api } from '../services/api';
import { Area, Report } from '../types';
import { PenTool, RotateCcw, Save, Trash2, Shuffle } from 'lucide-react';

export const MapPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [suburbsList, setSuburbsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]); // Array of [lat, lng]
  const [areaCode, setAreaCode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>([]);

  const mapSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [repsRes, areasRes, covRes, subsRes] = await Promise.all([
        Api.getReports({ limit: 500 }),
        Api.getAreas(),
        Api.getAreaCoverage(),
        Api.getSuburbs()
      ]);

      if (repsRes.success) setReports(repsRes.data);
      if (areasRes.success) setAreas(areasRes.data);
      if (covRes.success) setCoverage(covRes.data);
      if (subsRes.success) setSuburbsList(subsRes.suburbs);
    } catch (e) {
      console.error('Failed to load map data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Extract coordinates for GPS reports
  const validGpsReports = reports
    .map((r) => {
      if (r.gpsCoords && r.gpsCoords.lat) {
        return { r, lat: r.gpsCoords.lat, lng: r.gpsCoords.lng };
      }
      if (r.gps) {
        const m = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/.exec(r.gps);
        if (m) return { r, lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      }
      return null;
    })
    .filter((x): x is { r: Report; lat: number; lng: number } => x !== null);

  // Coordinate projections for 800 x 420 SVG map
  const W = 800;
  const H = 420;

  const allCoords: [number, number][] = [
    ...validGpsReports.map((p) => [p.lat, p.lng] as [number, number]),
    ...areas.flatMap((a) => a.poly || []),
    ...points
  ];

  // Default to Geelong center if no points
  const defaultCenter = [-38.1499, 144.3617];
  let minLat = defaultCenter[0] - 0.05;
  let maxLat = defaultCenter[0] + 0.05;
  let minLng = defaultCenter[1] - 0.06;
  let maxLng = defaultCenter[1] + 0.06;

  if (allCoords.length > 0) {
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    minLat = Math.min(...lats);
    maxLat = Math.max(...lats);
    minLng = Math.min(...lngs);
    maxLng = Math.max(...lngs);
  }

  // Padding
  const padLat = Math.max(0.005, (maxLat - minLat) * 0.1);
  const padLng = Math.max(0.005, (maxLng - minLng) * 0.1);
  minLat -= padLat;
  maxLat += padLat;
  minLng -= padLng;
  maxLng += padLng;

  const avgLat = (minLat + maxLat) / 2;
  const k = Math.cos((avgLat * Math.PI) / 180);
  const scale = Math.min(W / ((maxLng - minLng) * k), H / (maxLat - minLat));
  const ox = (W - (maxLng - minLng) * k * scale) / 2;
  const oy = (H - (maxLat - minLat) * scale) / 2;

  const project = (lat: number, lng: number): [number, number] => {
    const x = ox + (lng - minLng) * k * scale;
    const y = H - oy - (lat - minLat) * scale;
    return [x, y];
  };

  const unproject = (x: number, y: number): [number, number] => {
    const lng = (x - ox) / (k * scale) + minLng;
    const lat = (H - oy - y) / scale + minLat;
    return [lat, lng];
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const [lat, lng] = unproject(x, y);
    setPoints((prev) => [...prev, [lat, lng]]);
  };

  const generateRandom5Digit = () => {
    let code: string;
    do {
      code = String(Math.floor(10000 + Math.random() * 90000));
    } while (areas.some((a) => a.code === code));
    setAreaCode(code);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(areaCode.trim())) {
      alert('Area code must be exactly 5 digits');
      return;
    }
    if (!areaName.trim()) {
      alert('Please enter an area name');
      return;
    }

    try {
      await Api.createArea({
        code: areaCode.trim(),
        name: areaName.trim(),
        suburbs: selectedSuburbs,
        poly: points.length >= 3 ? points : null
      });

      alert(`Area ${areaCode} saved successfully!`);
      setIsDrawing(false);
      setPoints([]);
      setAreaCode('');
      setAreaName('');
      setSelectedSuburbs([]);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save area');
    }
  };

  const handleDeleteArea = async (code: string) => {
    if (!window.confirm(`Delete area ${code}?`)) return;
    try {
      await Api.deleteArea(code);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete area');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px' }}>Coverage Map &amp; 5-Digit Areas</h2>
          <p style={{ color: 'var(--mute)', fontSize: '13px' }}>
            Interactive geographical inspection of sign reach (~50m radius) and zoning sectors
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`btn ${isDrawing ? 'btn-danger' : 'btn-sm'}`}
            style={{ gap: '6px' }}
          >
            <PenTool size={15} />
            <span>{isDrawing ? 'Stop Drawing' : 'Draw New Area'}</span>
          </button>
          {isDrawing && points.length > 0 && (
            <button
              onClick={() => setPoints((p) => p.slice(0, -1))}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <RotateCcw size={14} />
              <span>Undo Point</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '20px' }}>
        {/* Interactive SVG Map */}
        <div className="card" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--mute)' }}>
            <span>{validGpsReports.length} GPS points mapped (~50 m coverage radius)</span>
            {isDrawing && (
              <span style={{ color: 'var(--clay)', fontWeight: 600 }}>
                Click map to place polygon vertices ({points.length} points)
              </span>
            )}
          </div>

          <svg
            ref={mapSvgRef}
            viewBox={`0 0 ${W} ${H}`}
            onClick={handleMapClick}
            style={{
              width: '100%',
              height: 'auto',
              backgroundColor: 'var(--card-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              cursor: isDrawing ? 'crosshair' : 'default'
            }}
          >
            {/* Grid Lines */}
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line
                key={`v-${i}`}
                x1={i * 100}
                y1={0}
                x2={i * 100}
                y2={H}
                stroke="var(--line)"
                strokeDasharray="3 3"
              />
            ))}
            {[1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 84}
                x2={W}
                y2={i * 84}
                stroke="var(--line)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Existing Areas Polygons */}
            {areas.map((area) => {
              if (!area.poly || area.poly.length < 3) return null;
              const polyPoints = area.poly.map((p) => project(p[0], p[1]).join(',')).join(' ');
              return (
                <polygon
                  key={area.code}
                  points={polyPoints}
                  fill="var(--clay)"
                  fillOpacity="0.14"
                  stroke="var(--clay)"
                  strokeWidth="2"
                />
              );
            })}

            {/* Currently Drawing Polyline */}
            {points.length > 0 && (
              <polyline
                points={points.map((p) => project(p[0], p[1]).join(',')).join(' ')}
                fill="none"
                stroke="var(--red)"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            )}
            {points.map((p, idx) => {
              const [px, py] = project(p[0], p[1]);
              return <circle key={idx} cx={px} cy={py} r="4" fill="var(--red)" />;
            })}

            {/* GPS Inspection Discs (50m reach) */}
            {validGpsReports.map(({ r, lat, lng }) => {
              const [px, py] = project(lat, lng);
              return (
                <g key={r.ref}>
                  <circle cx={px} cy={py} r="14" fill="var(--clay)" fillOpacity="0.22" />
                  <circle cx={px} cy={py} r="3.5" fill="var(--clay)" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Area Form & Coverage Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add / Edit Area Box */}
          <form onSubmit={handleSaveArea} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '18px' }}>{isDrawing ? 'Save Drawn Area' : 'Define 5-Digit Area'}</h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
                5-Digit Area Code
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. 32200"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={generateRandom5Digit}
                  className="btn btn-secondary btn-sm"
                  title="Random Code"
                >
                  <Shuffle size={14} />
                  <span>Random</span>
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
                Area Name
              </label>
              <input
                type="text"
                placeholder="e.g. Geelong CBD & Waterfront"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
                Included Suburbs
              </label>
              <select
                multiple
                value={selectedSuburbs}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                  setSelectedSuburbs(opts);
                }}
                style={{ width: '100%', height: '80px' }}
              >
                {suburbsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '4px' }}>
                Hold Ctrl (Cmd) to select multiple suburbs.
              </div>
            </div>

            <button type="submit" className="btn btn-sm" style={{ gap: '6px', alignSelf: 'flex-start' }}>
              <Save size={14} />
              <span>Save Area</span>
            </button>
          </form>

          {/* Area Coverage Table */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Area Street Coverage</h3>

            <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Done / Total</th>
                    <th>Coverage</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--mute)' }}>
                        No areas defined yet.
                      </td>
                    </tr>
                  ) : (
                    coverage.map((c) => (
                      <tr key={c.code}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</td>
                        <td style={{ fontSize: '12px' }}>{c.name}</td>
                        <td style={{ fontSize: '12px' }}>
                          {c.doneStreets} / {c.totalStreets}
                        </td>
                        <td>
                          <span className={`badge ${c.percentage > 50 ? 'badge-green' : 'badge-clay'}`}>
                            {c.percentage}%
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteArea(c.code)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', color: 'var(--red)' }}
                            title="Delete Area"
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
    </div>
  );
};
