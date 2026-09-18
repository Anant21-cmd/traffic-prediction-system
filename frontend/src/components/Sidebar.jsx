import { NavLink } from 'react-router-dom';
import { Gauge, CarFront, History, GitBranch, Info, X, Play, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/predict', label: 'Traffic Prediction', icon: CarFront },
  { to: '/simulator', label: 'Live Simulator', icon: Play },
  { to: '/history', label: 'Prediction History', icon: History },
  { to: '/performance', label: 'Model Performance', icon: GitBranch },
  { to: '/about', label: 'About Project', icon: Info },
];

export default function Sidebar({ open, onClose, isDark, setIsDark }) {
  const [backendOnline, setBackendOnline] = useState(null); // null = checking

  useEffect(() => {
    let cancelled = false;
    checkHealth()
      .then(() => { if (!cancelled) setBackendOnline(true); })
      .catch(() => { if (!cancelled) setBackendOnline(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true" />
        <div className="sidebar-brand-text">
          Traffic AI
          <span>Decision Tree Predictor</span>
        </div>
        <button onClick={onClose} aria-label="Close menu" className="sidebar-close-btn">
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div className="sidebar-status" style={{ margin: 0 }}>
            <span
              className={`status-dot ${backendOnline === null ? '' : backendOnline ? 'online' : 'offline'}`}
            />
            {backendOnline === null ? 'Checking...' : backendOnline ? 'Connected' : 'Unreachable'}
          </div>
          <button 
            type="button" 
            onClick={() => setIsDark(!isDark)} 
            className="preset-btn"
            style={{ padding: '0.25rem 0.5rem' }}
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
        AI-Based Traffic Prediction System
      </div>
    </aside>
  );
}
