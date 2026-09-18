"""
app.py

Flask backend for the AI-Based Traffic Prediction System.

Endpoints
---------
GET  /health       -> simple "is the server up" check
GET  /model-info    -> algorithm info + saved evaluation metrics
POST /predict       -> run the trained Decision Tree on one traffic
                        reading and return the predicted level
GET  /history        -> list all past predictions (from SQLite)
DELETE /history      -> clear all past predictions

Run:
    python app.py
The server starts on http://localhost:5000
"""

import json
import os
import sqlite3
from datetime import datetime

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "traffic_model.pkl")
METRICS_PATH = os.path.join(BASE_DIR, "models", "metrics.json")
DB_PATH = os.path.join(BASE_DIR, "predictions.db")

VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
VALID_WEATHER = {"Sunny", "Cloudy", "Rainy", "Stormy"}
VALID_PREVIOUS = {"Low", "Medium", "High"}
PEAK_HOURS = {7, 8, 9, 17, 18, 19, 20}

app = Flask(__name__)
CORS(app)  # allow the React dev server (different port) to call this API

model = None
metrics = {}


# ---------------------------------------------------------------------
# Startup helpers
# ---------------------------------------------------------------------

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Loaded model from {MODEL_PATH}")
    else:
        model = None
        print(f"WARNING: no trained model found at {MODEL_PATH}. Run train_model.py first.")


def load_metrics():
    global metrics
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH) as f:
            metrics = json.load(f)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            vehicle_count INTEGER NOT NULL,
            hour INTEGER NOT NULL,
            day_of_week TEXT NOT NULL,
            weather TEXT NOT NULL,
            location TEXT NOT NULL,
            previous_traffic TEXT NOT NULL,
            predicted_level TEXT NOT NULL,
            confidence REAL NOT NULL,
            explanation TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------
# Prediction helpers
# ---------------------------------------------------------------------

def build_explanation(vehicle_count, hour, weather, previous_traffic, prediction):
    """A simple, RULE-BASED explanation of the prediction.

    IMPORTANT (academic honesty): the Decision Tree itself does not
    generate natural-language text. This function just describes, in
    plain English, which of the well-known contributing factors point
    toward the predicted level. It is a simplified explanation for the
    demo, not a literal trace of the tree's internal decision path.
    """
    reasons = []

    if vehicle_count >= 220:
        reasons.append(f"Vehicle count ({vehicle_count}) is high for this road")
    elif vehicle_count <= 90:
        reasons.append(f"Vehicle count ({vehicle_count}) is low for this road")
    else:
        reasons.append(f"Vehicle count ({vehicle_count}) is moderate for this road")

    if hour in PEAK_HOURS:
        reasons.append("The selected time falls within typical peak commute hours")
    else:
        reasons.append("The selected time is outside typical peak commute hours")

    if weather in ("Rainy", "Stormy"):
        reasons.append(f"{weather} weather tends to increase congestion")
    else:
        reasons.append(f"{weather} weather has little effect on congestion")

    reasons.append(f"The previous recorded traffic level was {previous_traffic}")

    return reasons


def validate_predict_payload(data):
    """Returns an error message string, or None if the payload is valid."""
    if data is None:
        return "Request body must be JSON."

    required = ["vehicle_count", "hour", "day_of_week", "weather", "location", "previous_traffic"]
    for field in required:
        if field not in data or data[field] in (None, ""):
            return f"Missing required field: {field}"

    try:
        vehicle_count = int(data["vehicle_count"])
    except (ValueError, TypeError):
        return "vehicle_count must be a whole number."
    if vehicle_count < 0 or vehicle_count > 2000:
        return "vehicle_count must be between 0 and 2000."

    try:
        hour = int(data["hour"])
    except (ValueError, TypeError):
        return "hour must be a whole number between 0 and 23."
    if hour < 0 or hour > 23:
        return "hour must be between 0 and 23."

    if data["day_of_week"] not in VALID_DAYS:
        return f"day_of_week must be one of {sorted(VALID_DAYS)}."
    if data["weather"] not in VALID_WEATHER:
        return f"weather must be one of {sorted(VALID_WEATHER)}."
    if data["previous_traffic"] not in VALID_PREVIOUS:
        return f"previous_traffic must be one of {sorted(VALID_PREVIOUS)}."
    if not str(data["location"]).strip():
        return "location must not be empty."

    return None


# ---------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Traffic Prediction API is running",
        "endpoints": ["/health", "/model-info", "/predict", "/history"]
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "Backend is running", "model_loaded": model is not None})


@app.route("/model-info", methods=["GET"])
def model_info():
    return jsonify(
        {
            "algorithm": "Decision Tree Classifier",
            "library": "scikit-learn",
            "features": ["vehicle_count", "hour", "day_of_week", "weather", "location", "previous_traffic"],
            "classes": ["Low", "Medium", "High"],
            "model_loaded": model is not None,
            "metrics": metrics,
        }
    )


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not found on the server. Run train_model.py, then restart the API."}), 503

    data = request.get_json(silent=True)
    error = validate_predict_payload(data)
    if error:
        return jsonify({"error": error}), 400

    vehicle_count = int(data["vehicle_count"])
    hour = int(data["hour"])
    day_of_week = data["day_of_week"]
    weather = data["weather"]
    location = str(data["location"]).strip()
    previous_traffic = data["previous_traffic"]

    input_df = pd.DataFrame(
        [
            {
                "vehicle_count": vehicle_count,
                "hour": hour,
                "day_of_week": day_of_week,
                "weather": weather,
                "location": location,
                "previous_traffic": previous_traffic,
            }
        ]
    )

    try:
        prediction = model.predict(input_df)[0]
        probabilities = model.predict_proba(input_df)[0]
        classes = list(model.classes_)
        confidence = float(max(probabilities))
    except Exception as exc:  # keep the demo resilient; report a clean error instead of a 500 stack trace
        return jsonify({"error": f"Prediction failed: {exc}"}), 500

    explanation = build_explanation(vehicle_count, hour, weather, previous_traffic, prediction)
    probability_map = {cls: round(float(p), 3) for cls, p in zip(classes, probabilities)}

    # Save this prediction to history
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """INSERT INTO predictions
           (timestamp, vehicle_count, hour, day_of_week, weather, location, previous_traffic,
            predicted_level, confidence, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            datetime.now().isoformat(timespec="seconds"),
            vehicle_count,
            hour,
            day_of_week,
            weather,
            location,
            previous_traffic,
            prediction,
            confidence,
            json.dumps(explanation),
        ),
    )
    conn.commit()
    conn.close()

    return jsonify(
        {
            "prediction": prediction,
            "confidence": round(confidence, 3),
            "probabilities": probability_map,
            "explanation": explanation,
            "input_summary": {
                "vehicle_count": vehicle_count,
                "hour": hour,
                "day_of_week": day_of_week,
                "weather": weather,
                "location": location,
                "previous_traffic": previous_traffic,
            },
        }
    )


@app.route("/history", methods=["GET"])
def get_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM predictions ORDER BY id DESC").fetchall()
    conn.close()

    result = []
    for row in rows:
        record = dict(row)
        record["explanation"] = json.loads(record["explanation"])
        result.append(record)
    return jsonify(result)


@app.route("/history", methods=["DELETE"])
def clear_history():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM predictions")
    conn.commit()
    conn.close()
    return jsonify({"status": "History cleared"})


@app.errorhandler(404)
def not_found(_e):
    return jsonify({"error": "Endpoint not found."}), 404


load_model()
load_metrics()
init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
