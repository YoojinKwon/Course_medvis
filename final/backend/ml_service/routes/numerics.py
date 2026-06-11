from flask import Blueprint, jsonify
from core.model_loader import ModelStore
import numpy as np

bp = Blueprint("numerics", __name__)

STEP_SECONDS = 1024 / 999.56   # ~1.0245 s per counter step


@bp.route("/api/ml/numerics/<subject_id>")
def patient_numerics(subject_id):
    store = ModelStore.get()

    if subject_id not in store.subject_map:
        return jsonify({"error": f"Patient {subject_id} not found"}), 404

    row_idx, prob = store.best_window_for_patient(subject_id)
    row = store.meta.iloc[row_idx]
    window = store.windows[row_idx]   # (9, 512)

    def clean(v):
        if v != v or abs(v) == float("inf"):
            return None
        return round(float(v), 4)

    data = [[clean(v) for v in window[ch]] for ch in range(window.shape[0])]
    timestamps = [round(i * STEP_SECONDS / 60, 3) for i in range(window.shape[1])]

    return jsonify({
        "subject_id": subject_id,
        "window_idx": int(row["window_idx"]),
        "risk_prob": round(prob, 4),
        "risk_level": store.prob_to_level(prob),
        "channels": store.ch_names,
        "n_timesteps": int(window.shape[1]),
        "step_seconds": round(STEP_SECONDS, 4),
        "timestamps": timestamps,
        "data": data,
    })
