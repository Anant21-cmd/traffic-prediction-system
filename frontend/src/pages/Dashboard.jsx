import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { getHistory } from '../services/api';
import { getApiErrorMessage } from '../services/api';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import RoadIllustration from '../components/RoadIllustration';
import TrafficMap from '../components/TrafficMap';
import { TRAFFIC_LEVELS, DAYS_OF_WEEK } from '../constants';

const MAP_LOCATIONS = [
  { name: 'Main Road', lat: 40.7128, lng: -74.0060 },
  { name: 'Ring Road', lat: 40.7200, lng: -74.0100 },
  { name: 'Market Street', lat: 40.7150, lng: -74.0200 },
  { name: 'Highway Junction', lat: 40.7050, lng: -73.9900 },
  { name: 'College Road', lat: 40.7300, lng: -73.9950 },
];

const LEVEL_HEX = { Low: '#1e8e5a', Medium: '#b9760f', High: '#c4432e' };
const LEVEL_Y = { Low: 0, Medium: 1, High: 2 };
const GRID_STROKE = '#e2e3df';
const AXIS_PROPS = { fontSize: 12, tickLine: false, axisLine: false };

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]);
  const [mapLocations, setMapLocations] = useState(MAP_LOCATIONS);
  const navigate = useNavigate();

  useEffect(() => {
    // Try to center the map on the user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        // Update the 5 marker locations to be clustered around the user
        setMapLocations([
          { name: 'Main Road', lat: latitude + 0.005, lng: longitude + 0.005 },
          { name: 'Ring Road', lat: latitude - 0.005, lng: longitude - 0.005 },
          { name: 'Market Street', lat: latitude + 0.002, lng: longitude - 0.004 },
          { name: 'Highway Junction', lat: latitude - 0.003, lng: longitude + 0.006 },
          { name: 'College Road', lat: latitude + 0.008, lng: longitude },
        ]);
      }, () => {
        console.warn('Geolocation failed or denied. Using default map center.');
      });
    }

    getHistory()
      .then(setHistory)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    history.forEach((h) => {
      counts[h.predicted_level] = (counts[h.predicted_level] || 0) + 1;
    });
    return { total: history.length, ...counts };
  }, [history]);

  const latest = history[0]; // API returns history ordered newest-first

  const distributionData = useMemo(
    () => TRAFFIC_LEVELS.map((level) => ({ level, count: stats[level] })),
    [stats]
  );

  const byDayData = useMemo(() => {
    const counts = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, 0]));
    history.forEach((h) => { counts[h.day_of_week] = (counts[h.day_of_week] || 0) + 1; });
    return DAYS_OF_WEEK.map((d) => ({ day: d.slice(0, 3), count: counts[d] }));
  }, [history]);

  const byHourData = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0);
    history.forEach((h) => { counts[h.hour] += 1; });
    return counts.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [history]);

  const scatterSeries = useMemo(
    () => TRAFFIC_LEVELS.map((level) => ({
      level,
      points: history
        .filter((h) => h.predicted_level === level)
        .map((h) => ({ x: h.vehicle_count, y: LEVEL_Y[level] + (Math.random() - 0.5) * 0.5 })),
    })),
    [history]
  );

  if (loading) return <Loader label="Loading dashboard…" />;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>A live overview of traffic predictions made with the trained Decision Tree model.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <TrafficMap 
        locations={mapLocations} 
        center={mapCenter}
        onLocationClick={(loc) => navigate('/predict', { state: { location: loc.name } })}
      />

      {latest ? (
        <div
          className="signal-hero"
          style={{ '--hero-accent': `var(--color-${latest.predicted_level.toLowerCase()})` }}
        >
          <div>
            <div className="signal-hero-eyebrow">Most recent prediction</div>
            <div className="signal-hero-level">{latest.predicted_level.toUpperCase()} TRAFFIC</div>
            <div className="signal-hero-meta">
              {latest.location} · {latest.day_of_week}, {String(latest.hour).padStart(2, '0')}:00 · {latest.weather}
            </div>
          </div>
          <div className="signal-hero-confidence">
            <div className="signal-hero-confidence-value">{Math.round(latest.confidence * 100)}%</div>
            <div className="signal-hero-confidence-label">confidence</div>
          </div>
        </div>
      ) : (
        <div className="empty-hero">
          <RoadIllustration />
          <div className="empty-hero-text">
            <h2>No predictions yet</h2>
            <p>Run your first traffic prediction to see live stats and charts here.</p>
            <Link to="/predict" className="btn btn-primary">Make a prediction</Link>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Total Predictions" value={stats.total} />
        <StatCard label="High Traffic" value={stats.High} accentVar="--color-high" />
        <StatCard label="Medium Traffic" value={stats.Medium} accentVar="--color-medium" />
        <StatCard label="Low Traffic" value={stats.Low} accentVar="--color-low" />
      </div>

      {stats.total > 0 && (
        <div className="chart-grid">
          <div className="chart-card">
            <div className="card-title">Traffic Level Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={distributionData} dataKey="count" nameKey="level" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {distributionData.map((d) => <Cell key={d.level} fill={LEVEL_HEX[d.level]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="card-title">Vehicle Count vs Traffic Level</div>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" dataKey="x" name="Vehicle count" {...AXIS_PROPS} />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-0.6, 2.6]}
                  ticks={[0, 1, 2]}
                  tickFormatter={(v) => TRAFFIC_LEVELS[Math.round(v)]}
                  width={58}
                  {...AXIS_PROPS}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => (name === 'x' ? [value, 'Vehicle count'] : [value, name])} />
                {scatterSeries.map((s) => (
                  <Scatter key={s.level} name={s.level} data={s.points} fill={LEVEL_HEX[s.level]} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="card-title">Predictions by Day</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="day" {...AXIS_PROPS} />
                <YAxis allowDecimals={false} width={28} {...AXIS_PROPS} />
                <Tooltip />
                <Bar dataKey="count" fill="#2c5cc5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="card-title">Predictions by Hour</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byHourData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="hour" interval={2} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={28} {...AXIS_PROPS} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2c5cc5" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
