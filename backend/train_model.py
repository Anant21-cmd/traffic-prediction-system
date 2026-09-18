"""
train_model.py

Trains the Decision Tree traffic-prediction model.

Pipeline:
  1. Load traffic_data.csv
  2. Split into features (X) and target (y = traffic_level)
  3. Encode categorical columns (One-Hot Encoding) inside a Pipeline,
     so the exact same encoding is automatically re-applied at
     prediction time -- no separate encoder to keep in sync by hand.
  4. Train/test split (80% / 20%, stratified so all 3 classes are
     represented proportionally in both sets)
  5. Train a DecisionTreeClassifier
  6. Evaluate: accuracy, precision, recall, F1-score, confusion matrix
  7. Save the trained pipeline (models/traffic_model.pkl) and the
     evaluation metrics (models/metrics.json) for the API/frontend to
     read
  8. Save a simplified decision-tree diagram image for the
     "Model Performance" page

Run:
    python train_model.py
"""

import json
import os

import joblib
import matplotlib
matplotlib.use("Agg")  # no display needed, just save a PNG
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier, plot_tree

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "traffic_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "traffic_model.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
TREE_IMAGE_PATH = os.path.join(BASE_DIR, "..", "frontend", "public", "decision_tree.png")

FEATURE_COLUMNS = ["vehicle_count", "hour", "day_of_week", "weather", "location", "previous_traffic"]
CATEGORICAL_FEATURES = ["day_of_week", "weather", "location", "previous_traffic"]
NUMERIC_FEATURES = ["vehicle_count", "hour"]
TARGET_COLUMN = "traffic_level"
CLASS_LABELS = ["Low", "Medium", "High"]


def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. Run generate_dataset.py first."
        )
    return pd.read_csv(DATA_PATH)


def build_pipeline() -> Pipeline:
    # ColumnTransformer applies OneHotEncoder only to the categorical
    # columns and passes the numeric columns through unchanged.
    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ],
        remainder="passthrough",
    )

    # Wrapping preprocessing + model in one Pipeline means the API only
    # ever has to call pipeline.predict(raw_dataframe) -- the encoding
    # step travels with the model, so it can never get out of sync.
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                DecisionTreeClassifier(
                    max_depth=8,
                    min_samples_leaf=6,
                    random_state=42,
                ),
            ),
        ]
    )
    return pipeline


def evaluate(pipeline: Pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="macro", labels=CLASS_LABELS, zero_division=0)
    recall = recall_score(y_test, y_pred, average="macro", labels=CLASS_LABELS, zero_division=0)
    f1 = f1_score(y_test, y_pred, average="macro", labels=CLASS_LABELS, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=CLASS_LABELS)
    report = classification_report(y_test, y_pred, labels=CLASS_LABELS, zero_division=0)

    print("\n=== Classification report ===")
    print(report)
    print("=== Confusion matrix (rows = actual, cols = predicted) ===")
    print(pd.DataFrame(cm, index=CLASS_LABELS, columns=CLASS_LABELS))

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm.tolist(),
        "labels": CLASS_LABELS,
    }


def save_tree_diagram(pipeline: Pipeline):
    """Saves a shallow (depth-limited) view of the tree purely so the
    Model Performance page has something concrete and readable to show.
    The real trained tree (max_depth=8) is too wide to read as an image,
    so this is explicitly a simplified illustration, not the full model."""
    os.makedirs(os.path.dirname(TREE_IMAGE_PATH), exist_ok=True)

    classifier = pipeline.named_steps["classifier"]
    preprocessor = pipeline.named_steps["preprocessor"]
    feature_names = preprocessor.get_feature_names_out()
    # Clean up the auto-generated OneHotEncoder names for readability
    feature_names = [f.replace("categorical__", "").replace("remainder__", "") for f in feature_names]

    plt.figure(figsize=(20, 10))
    plot_tree(
        classifier,
        max_depth=3,  # only show the first few splits -> readable diagram
        feature_names=feature_names,
        class_names=classifier.classes_,
        filled=True,
        rounded=True,
        fontsize=9,
    )
    plt.title("Decision Tree (first 3 levels shown - simplified for readability)")
    plt.tight_layout()
    plt.savefig(TREE_IMAGE_PATH, dpi=130)
    plt.close()
    print(f"Saved simplified tree diagram -> {TREE_IMAGE_PATH}")


def main():
    df = load_data()
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    metrics = evaluate(pipeline, X_test, y_test)
    metrics.update(
        {
            "algorithm": "Decision Tree Classifier",
            "n_samples": int(len(df)),
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "features": FEATURE_COLUMNS,
            "tree_depth": int(pipeline.named_steps["classifier"].get_depth()),
            "tree_leaves": int(pipeline.named_steps["classifier"].get_n_leaves()),
        }
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    save_tree_diagram(pipeline)

    print(f"\nSaved trained pipeline -> {MODEL_PATH}")
    print(f"Saved metrics -> {METRICS_PATH}")
    print(f"\nAccuracy: {metrics['accuracy']*100:.1f}%")


if __name__ == "__main__":
    main()
