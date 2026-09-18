"""
generate_dataset.py

Generates a realistic, pattern-based synthetic traffic dataset for
training the Decision Tree traffic prediction model.

Why synthetic data?
--------------------
Real historical traffic-sensor data is not available for this college
project, so we generate data that follows the SAME kind of patterns
real traffic data would show:

  - Peak commute hours (7-9 AM, 5-8 PM) on weekdays carry more vehicles
  - Weekends are generally lighter than weekdays
  - Bad weather (rain / storms) increases congestion
  - Traffic is "sticky": if the previous reading was High, the current
    one is somewhat more likely to be High too

How the target label is created
--------------------------------
Each row gets a continuous "congestion score" built from the factors
above plus random noise (so the classes overlap a little at the edges,
just like real traffic). The score is then cut into Low / Medium / High
using PERCENTILE thresholds (45th / 80th) computed from the generated
data itself. This keeps a realistic skew -- Low traffic is the most
common state, High traffic the least common -- without hand-tuning
magic numbers, and keeps every class well represented enough for the
Decision Tree to actually learn all three of them.

Run this file directly to (re)create backend/data/traffic_data.csv:
    python generate_dataset.py
"""

import numpy as np
import pandas as pd
import os

# Fixed seed -> the same dataset is produced every time this script
# runs. Reproducibility matters for a college project.
np.random.seed(42)

NUM_RECORDS = 3000

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKEND_DAYS = {"Saturday", "Sunday"}
WEATHERS = ["Sunny", "Cloudy", "Rainy", "Stormy"]
WEATHER_WEIGHTS = [0.45, 0.30, 0.20, 0.05]  # Sunny days are most common
LOCATIONS = ["Main Road", "Ring Road", "Market Street", "Highway Junction", "College Road"]
PREV_TRAFFIC_LEVELS = ["Low", "Medium", "High"]

PEAK_HOURS = {7, 8, 9, 17, 18, 19, 20}

# How much each weather condition typically adds to the congestion score.
WEATHER_CONGESTION_BONUS = {"Sunny": 0, "Cloudy": 8, "Rainy": 20, "Stormy": 32}

# How much a given "previous traffic" reading nudges the current score.
PREV_TRAFFIC_BONUS = {"Low": -6, "Medium": 8, "High": 20}

# Percentile cut points used to turn the continuous score into 3 classes.
LOW_PERCENTILE = 45
HIGH_PERCENTILE = 80


def sample_vehicle_count(is_peak: bool, is_weekend: bool) -> int:
    """Vehicle counts cluster around a base value that depends on
    whether it's a peak hour and whether it's a weekend, then add
    realistic random noise (a Normal distribution, like real traffic
    counts do)."""
    if is_peak and not is_weekend:
        base, spread = 270, 55   # weekday rush hour -> busiest
    elif is_peak and is_weekend:
        base, spread = 150, 45   # weekend "peak" is milder
    elif not is_peak and not is_weekend:
        base, spread = 120, 45   # weekday, off-peak
    else:
        base, spread = 70, 35    # weekend, off-peak -> quietest

    count = np.random.normal(base, spread)
    return int(np.clip(count, 10, 500))


def congestion_score(vehicle_count, hour, is_weekend, weather, prev_traffic) -> float:
    """A single continuous number that stands in for 'how congested is
    the road right now'. Built entirely from real, explainable causes so
    the Decision Tree has genuine patterns to learn -- the noise term
    just keeps it from being perfectly, unrealistically separable."""
    is_peak = hour in PEAK_HOURS

    score = vehicle_count * 0.45
    score += 22 if is_peak else 0
    score -= 12 if is_weekend else 0
    score += WEATHER_CONGESTION_BONUS[weather]
    score += PREV_TRAFFIC_BONUS[prev_traffic]
    score += np.random.normal(0, 18)  # measurement-style noise
    return score


def generate_dataset(num_records: int = NUM_RECORDS) -> pd.DataFrame:
    rows = []
    for _ in range(num_records):
        day = np.random.choice(DAYS)
        is_weekend = day in WEEKEND_DAYS
        hour = int(np.random.randint(0, 24))
        weather = np.random.choice(WEATHERS, p=WEATHER_WEIGHTS)
        location = np.random.choice(LOCATIONS)
        prev_traffic = np.random.choice(PREV_TRAFFIC_LEVELS, p=[0.4, 0.35, 0.25])

        vehicle_count = sample_vehicle_count(hour in PEAK_HOURS, is_weekend)
        score = congestion_score(vehicle_count, hour, is_weekend, weather, prev_traffic)

        rows.append({
            "vehicle_count": vehicle_count,
            "hour": hour,
            "day_of_week": day,
            "weather": weather,
            "location": location,
            "previous_traffic": prev_traffic,
            "_score": score,
        })

    df = pd.DataFrame(rows)

    low_cut = np.percentile(df["_score"], LOW_PERCENTILE)
    high_cut = np.percentile(df["_score"], HIGH_PERCENTILE)

    def bucket(s):
        if s < low_cut:
            return "Low"
        elif s < high_cut:
            return "Medium"
        return "High"

    df["traffic_level"] = df["_score"].apply(bucket)
    df = df.drop(columns=["_score"])
    return df


if __name__ == "__main__":
    df = generate_dataset()

    out_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "traffic_data.csv")
    df.to_csv(out_path, index=False)

    print(f"Generated {len(df)} records -> {out_path}")
    print("\nClass balance:")
    counts = df["traffic_level"].value_counts()
    print(counts)
    print("\nClass balance (%):")
    print((counts / len(df) * 100).round(1))
    print("\nSample rows:")
    print(df.head(8).to_string(index=False))
