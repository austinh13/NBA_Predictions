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

# Open ONE persistent connection at module load time and reuse it for
# the lifetime of the process. Opening a fresh connection per request
# causes the underlying Rust/tokio runtime inside libsql to be torn
# down and recreated repeatedly, which crashes under Gunicorn with:
#   "failed to join thread: Resource deadlock avoided"
# Reusing a single connection avoids that entirely.
#
# _db_conn is held in a mutable holder (list) so reconnect_db() can
# swap it out in place without needing a `global` rebind in every
# calling function.
_db_conn_holder = []

def _create_connection():
    return libsql.connect(
        database=TURSO_URL,
        auth_token=TURSO_AUTH_TOKEN,
    )

def reconnect_db():
    """Replace the live connection with a fresh one. Called when a
    cache operation fails, in case the old connection went stale
    (network blip, idle timeout on Turso's side, etc)."""
    print("🔄 Reconnecting to Turso...")
    new_conn = _create_connection()
    if _db_conn_holder:
        _db_conn_holder[0] = new_conn
    else:
        _db_conn_holder.append(new_conn)
    return new_conn

def get_conn():
    if not _db_conn_holder:
        reconnect_db()
    return _db_conn_holder[0]

def run_with_retry(fn):
    """Run a function that takes a connection and returns a result.
    On failure, reconnect once and retry. If the retry also fails,
    the exception propagates and the caller treats it as a cache miss
    (the route still falls back to running the model)."""
    conn = get_conn()
    try:
        return fn(conn)
    except Exception as e:
        print(f"⚠️ DB operation failed ({e}), retrying with fresh connection...")
        conn = reconnect_db()
        return fn(conn)

def init_db():
    def _init(conn):
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
    run_with_retry(_init)

init_db()

def hash_features(features):
    """Deterministic hash for an exact feature vector match."""
    normalized = json.dumps([round(f, 4) for f in features])
    return hashlib.sha256(normalized.encode()).hexdigest()

def get_cached_prediction(features):
    feature_hash = hash_features(features)

    def _get(conn):
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
            return row[0]
        return None

    try:
        return run_with_retry(_get)
    except Exception as e:
        # If the cache is unreachable even after a reconnect attempt,
        # treat it as a miss rather than failing the whole prediction.
        print(f"⚠️ Cache lookup failed after retry, falling back to model: {e}")
        return None

def store_prediction(features, prediction):
    feature_hash = hash_features(features)

    def _store(conn):
        conn.execute(
            """INSERT INTO prediction_cache (feature_hash, features, prediction)
               VALUES (?, ?, ?)
               ON CONFLICT(feature_hash) DO NOTHING""",
            (feature_hash, json.dumps(features), prediction)
        )
        conn.commit()

    try:
        run_with_retry(_store)
    except Exception as e:
        # Failing to cache shouldn't fail the request — the user still
        # gets their prediction, it just won't be cached this time.
        print(f"⚠️ Cache write failed after retry, continuing without caching: {e}")

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


@app.route("/nba_predictions")
def get_nba_data():
    sampled = filtered_pf.sample(n=1000, random_state=42)
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
    def _stats(conn):
        cursor = conn.execute(
            "SELECT COUNT(*) as total_entries, SUM(hit_count) as total_hits FROM prediction_cache"
        )
        return cursor.fetchone()

    try:
        row = run_with_retry(_stats)
    except Exception as e:
        return jsonify({"error": f"cache unreachable: {e}"}), 503

    return jsonify({
        "unique_predictions_cached": row[0] or 0,
        "total_requests_served_from_cache": (row[1] or 0) - (row[0] or 0)
    })


if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    app.run(host="127.0.0.1", port=5000, debug=True)
