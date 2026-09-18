import { useState, useEffect, useRef } from 'react';
import { Play, Square, Activity } from 'lucide-react';
import { predictTraffic } from '../services/api';
import { DAYS_OF_WEEK, WEATHER_OPTIONS, LOCATION_OPTIONS, TRAFFIC_LEVELS } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LEVEL_Y = { Low: 0, Medium: 1, High: 2 };

export default function LiveSimulator() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(async () => {
        const payload = {
          vehicle_count: Math.floor(Math.random() * 800),
          hour: Math.floor(Math.random() * 24),
          day_of_week: getRandomItem(DAYS_OF_WEEK),
          weather: getRandomItem(WEATHER_OPTIONS),
          location: getRandomItem(LOCATION_OPTIONS),
          previous_traffic: getRandomItem(TRAFFIC_LEVELS),
        };
        try {
          const result = await predictTraffic(payload);
          setLogs(prev => {
            const newLogs = [...prev, {
              time: new Date().toLocaleTimeString(),
              ...payload,
              prediction: result.prediction,
              confidence: result.confidence,
              y: LEVEL_Y[result.prediction]
            }];
            return newLogs.slice(-20); // keep last 20
          });
        } catch (e) {
          console.error('Simulation error', e);
        }
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [running]);

  return (
    <div>
      <div className="page-header">
        <h1>Live Simulator</h1>
        <p>Automatically generates random traffic inputs and hits the prediction API every 3 seconds.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => setRunning(!running)}
          style={{ backgroundColor: running ? 'var(--color-high)' : 'var(--color-low)' }}
        >
          {running ? <Square size={16} /> : <Play size={16} />}
          {running ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        {running && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink-muted)' }}>
          <Activity size={16} className="spinner" /> Simulating requests...
        </div>}
      </div>

      {logs.length > 0 && (
        <div className="chart-card">
          <div className="card-title">Live Traffic Predictions</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={logs}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="time" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                domain={[-0.5, 2.5]} 
                ticks={[0, 1, 2]} 
                tickFormatter={(v) => TRAFFIC_LEVELS[v]} 
                width={60} 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip formatter={(value, name, props) => [
                props.payload.prediction, 'Traffic Level'
              ]} />
              <Line type="stepAfter" dataKey="y" stroke="var(--color-accent)" strokeWidth={3} isAnimationActive={false} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

