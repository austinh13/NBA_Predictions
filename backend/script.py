# URL of the Kaggle dataset
#dataset_url = "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats/"

import torch
import torch.nn as nn
import pandas as pd
import hashlib
import json
import os
import libsql
from flask import Flask, jsonify, request
from flask_cors import CORS

device = 'cuda' if torch.cuda.is_available() else 'cpu'

filtered_pf = pd.read_pickle("filtered_df.pkl")

# ──────────────────────────────────────────────
# Turso (libSQL) cache setup — persists across
# Render restarts/redeploys/spin-downs since the
# database lives on Turso's servers, not on disk.
# ──────────────────────────────────────────────
TURSO_URL = os.environ["TURSO_DATABASE_URL"]        # e.g. libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN = os.environ["TURSO_AUTH_TOKEN"]

def get_db():
    # Opens a connection to the remote Turso database.
    # libsql.connect() mirrors Python's built-in sqlite3 API.
    return libsql.connect(
        database=TURSO_URL,
        auth_token=TURSO_AUTH_TOKEN,
    )

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS prediction_cache (
            feature_hash TEXT PRIMARY KEY,
            features TEXT NOT NULL,
            prediction REAL NOT NULL,
            hit_count INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

def hash_features(features):
    """Deterministic hash for an exact feature vector match."""
    normalized = json.dumps([round(f, 4) for f in features])
    return hashlib.sha256(normalized.encode()).hexdigest()

def get_cached_prediction(features):
    feature_hash = hash_features(features)
    conn = get_db()
    cursor = conn.execute(
        "SELECT prediction FROM prediction_cache WHERE feature_hash = ?",
        (feature_hash,)
    )
    row = cursor.fetchone()

    if row:
        conn.execute(
            "UPDATE prediction_cache SET hit_count = hit_count + 1 WHERE feature_hash = ?",
            (feature_hash,)
        )
        conn.commit()
        conn.close()
        return row[0]

    conn.close()
    return None

def store_prediction(features, prediction):
    feature_hash = hash_features(features)
    conn = get_db()
    conn.execute(
        """INSERT INTO prediction_cache (feature_hash, features, prediction)
           VALUES (?, ?, ?)
           ON CONFLICT(feature_hash) DO NOTHING""",
        (feature_hash, json.dumps(features), prediction)
    )
    conn.commit()
    conn.close()

# ──────────────────────────────────────────────
# Model
# ──────────────────────────────────────────────
class MyModel(nn.Module): 
    def __init__(self, input_size):
        super(MyModel, self).__init__()
        self.fc1 = nn.Linear(input_size, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.dropout1 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(128, 64)
        self.bn2 = nn.BatchNorm1d(64)
        self.dropout2 = nn.Dropout(0.3)
        self.out = nn.Linear(64, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.dropout1(torch.relu(self.bn1(self.fc1(x))))
        x = self.dropout2(torch.relu(self.bn2(self.fc2(x))))
        x = self.sigmoid(self.out(x))
        return x

model = MyModel(input_size=6).to(device)
model.load_state_dict(torch.load("model.pth", map_location=device))
model.eval()

app = Flask(__name__)
CORS(app)


#sampled = non_zero.sample(n=1000, random_state=42)  # random_state for reproducibility

@app.route("/nba_predictions")
def get_nba_data():
    
    sampled = filtered_pf.sample(n=1000, random_state=42)  # random_state for reproducibility
    data = sampled[["mp_per_game","pts_per_game","ast_per_game","trb_per_game","type","fg_per_game"]].to_dict(orient="records")

    return jsonify(data)


@app.route("/predict_user_input", methods=["POST"])
def predict_input():
    try:
        user_data = request.json
        print("🔹 Received data:", user_data)

        features = user_data["features"]

        # ── Check cache first ──
        cached = get_cached_prediction(features)
        if cached is not None:
            print("⚡ Cache hit:", cached)
            return jsonify({"prediction": cached, "cached": True}), 200

        # ── Cache miss — run the model ──
        model_inputs = torch.tensor([features], dtype=torch.float32).to(device)

        with torch.no_grad():
            prediction = model(model_inputs)

        result = prediction.item()
        print("✅ Prediction (fresh):", result)

        store_prediction(features, result)

        return jsonify({"prediction": result, "cached": False}), 200
    except Exception as e:
        print("Error:", e) 
        return jsonify({"error": str(e)}), 500


@app.route("/cache_stats")
def cache_stats():
    """Inspect how much the cache is being used."""
    conn = get_db()
    cursor = conn.execute(
        "SELECT COUNT(*) as total_entries, SUM(hit_count) as total_hits FROM prediction_cache"
    )
    row = cursor.fetchone()
    conn.close()
    return jsonify({
        "unique_predictions_cached": row[0] or 0,
        "total_requests_served_from_cache": (row[1] or 0) - (row[0] or 0)
    })


if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    app.run(host="127.0.0.1", port=5000, debug=True)
