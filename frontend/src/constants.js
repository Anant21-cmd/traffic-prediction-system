// These lists mirror the backend's validation rules (see backend/app.py)
// and the categories the model was trained on (see backend/generate_dataset.py).
// Keeping them in one place means the form always offers choices the
// API will accept.

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Stormy'];

export const LOCATION_OPTIONS = [
  'Main Road', 'Ring Road', 'Market Street', 'Highway Junction', 'College Road',
];

export const TRAFFIC_LEVELS = ['Low', 'Medium', 'High'];

export const PEAK_HOURS = [7, 8, 9, 17, 18, 19, 20];

export const LEVEL_COLOR_VAR = {
  Low: '--color-low',
  Medium: '--color-medium',
  High: '--color-high',
};

// Example inputs known to produce a clear, high-confidence result with
// the shipped model -- handy for a live project-review demo.
export const DEMO_PRESETS = {
  Low: { vehicle_count: 40, hour: 2, day_of_week: 'Sunday', weather: 'Sunny', location: 'College Road', previous_traffic: 'Low' },
  Medium: { vehicle_count: 200, hour: 8, day_of_week: 'Monday', weather: 'Rainy', location: 'Main Road', previous_traffic: 'Medium' },
  High: { vehicle_count: 320, hour: 18, day_of_week: 'Friday', weather: 'Stormy', location: 'Highway Junction', previous_traffic: 'High' },
};
