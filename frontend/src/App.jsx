import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TrafficPrediction from './pages/TrafficPrediction';
import PredictionHistory from './pages/PredictionHistory';
import ModelPerformance from './pages/ModelPerformance';
import AboutProject from './pages/AboutProject';
import LiveSimulator from './pages/LiveSimulator';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="app-shell">
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isDark={isDark} 
        setIsDark={setIsDark} 
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mobile-topbar">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <strong style={{ fontFamily: 'var(--font-display)' }}>Traffic AI</strong>
          <span style={{ width: 20 }} />
        </div>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predict" element={<TrafficPrediction />} />
            <Route path="/simulator" element={<LiveSimulator />} />
            <Route path="/history" element={<PredictionHistory />} />
            <Route path="/performance" element={<ModelPerformance />} />
            <Route path="/about" element={<AboutProject />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
