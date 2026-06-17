# URL of the Kaggle dataset
#dataset_url = "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats/"

import torch
import torch.nn as nn
import pandas as pd
import hashlib
import json
import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

device = 'cuda' if torch.cuda.is_available() else 'cpu'

filtered_pf = pd.read_pickle("filtered_df.pkl")

# ──────────────────────────────────────────────
# Turso cache, via plain HTTP (no libsql bindings)
# ──────────────────────────────────────────────
# The libsql Python package wraps a Rust/tokio runtime that doesn't
# play well with Gunicorn's process model — it can hang indefinitely
# on the first connection with no exception raised, which defeats any
# timeout wrapped around it in Python.
#
# Turso also exposes a plain HTTP API (the same one their other SDKs
# use under the hood for "Hrana over HTTP"). Using `requests` instead
# gives us a real, enforceable network timeout — if Turso is slow or
# unreachable, we get an exception back in a few seconds, not a
# silent hang.
#
# Docs: https://docs.turso.tech/sdk/http/quickstart
TURSO_DATABASE_URL = os.environ["TURSO_DATABASE_URL"]  # e.g. libsql://your-db.turso.io
TURSO_AUTH_TOKEN = os.environ["TURSO_AUTH_TOKEN"]

# The HTTP API uses https://, not libsql://
TURSO_HTTP_URL = TURSO_DATABASE_URL.replace("libsql://", "https://").rstrip("/") + "/v2/pipeline"

TURSO_HEADERS = {
    "Authorization": f"Bearer {TURSO_AUTH_TOKEN}",
    "Content-Type": "application/json",
}

# Hard network timeout (seconds) for every Turso HTTP call. This is a
# REAL timeout enforced by `requests`/urllib3 at the socket level —
# unlike the libsql bindings, this one actually works.
TURSO_TIMEOUT = 4


def turso_execute(sql, params=None):
    """Run a single SQL statement against Turso over HTTP and return
    the rows as a list of plain Python values (already unwrapped from
    Turso's {"type": ..., "value": ...} column format).

    Raises requests.RequestException (including Timeout) on any
    network problem, or ValueError if Turso reports a SQL error —
    callers are expected to catch these and treat it as a cache miss.
    """
    stmt = {"sql": sql}
    if params is not None:
        # Turso's HTTP API wants each bound parameter as either a
        # bare JSON value (string/number/null) for positional args.
        stmt["args"] = [_to_turso_value(p) for p in params]

    payload = {
        "requests": [
            {"type": "execute", "stmt": stmt},
            {"type": "close"},
        ]
    }

    resp = requests.post(
        TURSO_HTTP_URL,
        headers=TURSO_HEADERS,
        json=payload,
        timeout=TURSO_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()

    # data["results"][0] corresponds to the "execute" request above.
    result_entry = data["results"][0]
    if result_entry.get("type") == "error":
        raise ValueError(result_entry.get("error", {}).get("message", "Unknown Turso error"))

    result = result_entry["response"]["result"]
    rows = result.get("rows", [])

    # Each row is a list of {"type": "text"/"integer"/"float"/"null", "value": ...}
    return [[_from_turso_value(cell) for cell in row] for row in rows]


def _to_turso_value(value):
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "integer", "value": str(int(value))}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    if isinstance(value, float):
        return {"type": "float", "value": value}
    return {"type": "text", "value": str(value)}


def _from_turso_value(cell):
    cell_type = cell.get("type")
    value = cell.get("value")
    if cell_type == "null":
        return None
    if cell_type == "integer":
        return int(value)
    if cell_type == "float":
        return float(value)
    return value


def init_db():
    try:
        turso_execute("""
            CREATE TABLE IF NOT EXISTS prediction_cache (
                feature_hash TEXT PRIMARY KEY,
                features TEXT NOT NULL,
                prediction REAL NOT NULL,
                hit_count INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Cache table ready")
    except Exception as e:
        # Don't block app startup if Turso is briefly unreachable —
        # the table gets created lazily on first successful write.
        print(f"⚠️ Could not initialize cache table at startup ({e}). Will retry later.")

init_db()


def hash_features(features):
    """Deterministic hash for an exact feature vector match."""
    normalized = json.dumps([round(f, 4) for f in features])
    return hashlib.sha256(normalized.encode()).hexdigest()


def get_cached_prediction(features):
    feature_hash = hash_features(features)
    try:
        rows = turso_execute(
            "SELECT prediction FROM prediction_cache WHERE feature_hash = ?",
            [feature_hash],
        )
        if rows:
            # Fire-and-forget hit count bump — don't let this slow
            # down or risk the actual cache read above.
            try:
                turso_execute(
                    "UPDATE prediction_cache SET hit_count = hit_count + 1 WHERE feature_hash = ?",
                    [feature_hash],
                )
            except Exception:
                pass  # hit_count is just a stat, not worth retrying/blocking on
            return rows[0][0]
        return None
    except Exception as e:
        # Cache unreachable/slow/erroring -> treat as a miss, let the
        # model run. Caching is an optimization, never a hard dependency.
        print(f"⚠️ Cache lookup failed, falling back to model: {e}")
        return None


def store_prediction(features, prediction):
    feature_hash = hash_features(features)
    try:
        turso_execute(
            """INSERT INTO prediction_cache (feature_hash, features, prediction)
               VALUES (?, ?, ?)
               ON CONFLICT(feature_hash) DO NOTHING""",
            [feature_hash, json.dumps(features), prediction],
        )
    except Exception as e:
        if "no such table" in str(e).lower():
            init_db()
            try:
                turso_execute(
                    """INSERT INTO prediction_cache (feature_hash, features, prediction)
                       VALUES (?, ?, ?)
                       ON CONFLICT(feature_hash) DO NOTHING""",
                    [feature_hash, json.dumps(features), prediction],
                )
                return
            except Exception as e2:
                print(f"⚠️ Cache write failed after table creation retry: {e2}")
                return
        # Failing to cache shouldn't fail the request — the user
        # still gets their prediction, it just won't be cached now.
        print(f"⚠️ Cache write failed, continuing without caching: {e}")


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
    try:
        rows = turso_execute(
            "SELECT COUNT(*) as total_entries, SUM(hit_count) as total_hits FROM prediction_cache"
        )
        row = rows[0] if rows else [0, 0]
    except Exception as e:
        return jsonify({"error": f"cache unreachable: {e}"}), 503

    total_entries = row[0] or 0
    total_hits = row[1] or 0
    return jsonify({
        "unique_predictions_cached": total_entries,
        "total_requests_served_from_cache": total_hits - total_entries
    })


if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    app.run(host="127.0.0.1", port=5000, debug=True)
