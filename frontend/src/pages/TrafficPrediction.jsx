import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CarFront, AlertTriangle, CloudRain } from 'lucide-react';
import { predictTraffic, getApiErrorMessage } from '../services/api';
import { DAYS_OF_WEEK, WEATHER_OPTIONS, LOCATION_OPTIONS, TRAFFIC_LEVELS, DEMO_PRESETS } from '../constants';

const INITIAL_FORM = {
  vehicle_count: '',
  time: '',
  day_of_week: 'Monday',
  weather: 'Sunny',
  location: LOCATION_OPTIONS[0],
  previous_traffic: 'Low',
};

function timeToHour(timeStr) {
  if (!timeStr) return null;
  const [h] = timeStr.split(':');
  return parseInt(h, 10);
}

export default function TrafficPrediction() {
  const routerLocation = useLocation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (routerLocation.state?.location) {
      setForm(f => ({ ...f, location: routerLocation.state.location }));
    }
  }, [routerLocation.state]);
  const [apiError, setApiError] = useState('');
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [weatherMsg, setWeatherMsg] = useState('');

  async function fetchWeather() {
    setFetchingWeather(true);
    setWeatherMsg('Fetching location...');
    if (!navigator.geolocation) {
      setWeatherMsg('Geolocation not supported');
      setFetchingWeather(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        setWeatherMsg('Fetching weather data...');
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const code = data.current_weather.weathercode;
        
        let mapped = 'Sunny';
        if (code >= 1 && code <= 3) mapped = 'Cloudy';
        else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 71 && code <= 77)) mapped = 'Rainy';
        else if (code >= 95 && code <= 99) mapped = 'Stormy';
        
        update('weather', mapped);
        setWeatherMsg(`Detected: ${mapped}`);
      } catch (e) {
        setWeatherMsg('Failed to fetch weather');
      } finally {
        setFetchingWeather(false);
      }
    }, () => {
      setWeatherMsg('Location denied');
      setFetchingWeather(false);
    });
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    const count = Number(form.vehicle_count);
    if (form.vehicle_count === '' || Number.isNaN(count)) {
      e.vehicle_count = 'Enter a vehicle count.';
    } else if (count < 0 || count > 2000) {
      e.vehicle_count = 'Must be between 0 and 2000.';
    }

    const hour = timeToHour(form.time);
    if (hour === null || Number.isNaN(hour)) e.time = 'Select a time.';

    if (!form.location.trim()) e.location = 'Required.';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setApiError('');
    setResult(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        vehicle_count: Number(form.vehicle_count),
        hour: timeToHour(form.time),
        day_of_week: form.day_of_week,
        weather: form.weather,
        location: form.location,
        previous_traffic: form.previous_traffic,
      };
      const data = await predictTraffic(payload);
      setResult(data);
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function loadPreset(level) {
    const preset = DEMO_PRESETS[level];
    setForm({
      vehicle_count: String(preset.vehicle_count),
      time: `${String(preset.hour).padStart(2, '0')}:00`,
      day_of_week: preset.day_of_week,
      weather: preset.weather,
      location: preset.location,
      previous_traffic: preset.previous_traffic,
    });
    setResult(null);
    setApiError('');
    setErrors({});
  }

  return (
    <div>
      <div className="page-header">
        <h1>Traffic Prediction</h1>
        <p>Enter current road conditions. The trained Decision Tree will classify congestion as Low, Medium, or High.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className={`form-field ${errors.vehicle_count ? 'has-error' : ''}`}>
              <label htmlFor="vehicle_count">Vehicle Count</label>
              <input
                id="vehicle_count"
                type="number"
                min="0"
                max="2000"
                placeholder="e.g. 200"
                value={form.vehicle_count}
                onChange={(e) => update('vehicle_count', e.target.value)}
              />
              {errors.vehicle_count && <span className="field-error">{errors.vehicle_count}</span>}
            </div>

            <div className={`form-field ${errors.time ? 'has-error' : ''}`}>
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
              />
              {errors.time && <span className="field-error">{errors.time}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="day_of_week">Day</label>
              <select id="day_of_week" value={form.day_of_week} onChange={(e) => update('day_of_week', e.target.value)}>
                {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="weather">Weather</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select id="weather" value={form.weather} onChange={(e) => update('weather', e.target.value)} style={{ flex: 1 }}>
                  {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
                <button type="button" className="btn btn-primary" style={{ padding: '0.65rem' }} onClick={fetchWeather} disabled={fetchingWeather} title="Fetch Live Weather">
                  <CloudRain size={16} />
                </button>
              </div>
              {weatherMsg && <span className="hint" style={{ color: weatherMsg.includes('Failed') || weatherMsg.includes('denied') || weatherMsg.includes('not supported') ? 'var(--color-high)' : 'var(--color-low)' }}>{weatherMsg}</span>}
            </div>

            <div className={`form-field ${errors.location ? 'has-error' : ''}`}>
              <label htmlFor="location">Location</label>
              <select id="location" value={form.location} onChange={(e) => update('location', e.target.value)}>
                {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="hint">Roads the model was trained on give the most reliable predictions.</span>
            </div>

            <div className="form-field">
              <label htmlFor="previous_traffic">Previous Traffic</label>
              <select id="previous_traffic" value={form.previous_traffic} onChange={(e) => update('previous_traffic', e.target.value)}>
                {TRAFFIC_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {apiError && (
            <div className="banner banner-error" style={{ marginTop: '1.25rem' }}>
              <AlertTriangle size={16} />
              {apiError}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <CarFront size={16} />
              {submitting ? 'Predicting…' : 'Predict Traffic'}
            </button>
            <span className="preset-row">
              Try a preset:
              {TRAFFIC_LEVELS.map((l) => (
                <button key={l} type="button" className="preset-btn" onClick={() => loadPreset(l)}>
                  {l}
                </button>
              ))}
            </span>
          </div>
        </form>
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

function ResultCard({ result }) {
  const accentVar = `--color-${result.prediction.toLowerCase()}`;
  return (
    <div className="result-card" style={{ '--result-accent': `var(${accentVar})` }}>
      <div className="result-top">
        <div>
          <div className="result-eyebrow">Traffic Level</div>
          <div className="result-level">{result.prediction.toUpperCase()}</div>
        </div>
        <div>
          <div className="result-eyebrow result-eyebrow-right">Confidence</div>
          <div className="result-confidence-value">{Math.round(result.confidence * 100)}%</div>
        </div>
      </div>

      <div className="probability-row">
        {TRAFFIC_LEVELS.map((level) => {
          const p = result.probabilities[level] ?? 0;
          return (
            <div className="probability-item" key={level}>
              <span>{level}</span>
              <div className="probability-track">
                <div
                  className="probability-fill"
                  style={{ width: `${p * 100}%`, background: `var(--color-${level.toLowerCase()})` }}
                />
              </div>
              <span>{Math.round(p * 100)}%</span>
            </div>
          );
        })}
      </div>

      <div className="result-explanation">
        <h4>Why this prediction?</h4>
        <ul>
          {result.explanation.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        <div className="note">
          Simplified, rule-based explanation for demo purposes — it summarizes known contributing
          factors, not a literal trace of the Decision Tree's internal path.
        </div>
      </div>
    </div>
  );
}
