import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, History as HistoryIcon } from 'lucide-react';
import { getHistory, clearHistory, getApiErrorMessage } from '../services/api';
import SignalBadge from '../components/SignalBadge';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { TRAFFIC_LEVELS } from '../constants';

function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PredictionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [confirmingClear, setConfirmingClear] = useState(false);

  function loadHistory() {
    setLoading(true);
    getHistory()
      .then(setHistory)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(loadHistory, []);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      const matchesLevel = levelFilter === 'All' || h.predicted_level === levelFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.location.toLowerCase().includes(q) ||
        h.weather.toLowerCase().includes(q) ||
        h.day_of_week.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [history, search, levelFilter]);

  async function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    try {
      await clearHistory();
      setHistory([]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirmingClear(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Prediction History</h1>
        <p>Every prediction made through this app, stored in SQLite on the backend.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <Loader label="Loading history…" />
      ) : history.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={HistoryIcon}
            title="No predictions yet"
            message="Predictions you make on the Traffic Prediction page will show up here."
          />
        </div>
      ) : (
        <>
          <div className="toolbar">
            <label className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by location, weather, or day…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select className="filter-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="All">All levels</option>
              {TRAFFIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-danger-text"
              onClick={handleClear}
              onBlur={() => setConfirmingClear(false)}
            >
              <Trash2 size={15} />
              {confirmingClear ? 'Click again to confirm' : 'Clear History'}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState title="No matches" message="No predictions match your search or filter." />
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Vehicle Count</th>
                    <th>Location</th>
                    <th>Weather</th>
                    <th>Predicted Traffic</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => (
                    <tr key={h.id}>
                      <td>{formatTimestamp(h.timestamp)}</td>
                      <td>{h.vehicle_count}</td>
                      <td>{h.location}</td>
                      <td>{h.weather}</td>
                      <td><SignalBadge level={h.predicted_level} /></td>
                      <td>{Math.round(h.confidence * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
