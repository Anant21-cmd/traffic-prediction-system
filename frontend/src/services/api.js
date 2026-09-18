import axios from 'axios';

// Change this if your Flask backend runs somewhere other than
// http://localhost:5000 (e.g. deployed elsewhere), or set VITE_API_URL
// in a .env file in this folder.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function checkHealth() {
  const { data } = await client.get('/health');
  return data;
}

export async function getModelInfo() {
  const { data } = await client.get('/model-info');
  return data;
}

export async function predictTraffic(payload) {
  const { data } = await client.post('/predict', payload);
  return data;
}

export async function getHistory() {
  const { data } = await client.get('/history');
  return data;
}

export async function clearHistory() {
  const { data } = await client.delete('/history');
  return data;
}

// Turns any axios error into a short, user-friendly message.
export function getApiErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error;
  }
  if (error.request) {
    return 'Could not reach the backend. Make sure the Flask server is running on http://localhost:5000.';
  }
  return 'Something went wrong. Please try again.';
}
