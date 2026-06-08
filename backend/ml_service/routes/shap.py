from flask import Blueprint, jsonify, request
from core.model_loader import ModelStore
import numpy as np

bp = Blueprint("shap", __name__)


@bp.route("/api/ml/shap/<subject_id>")
def patient_shap(subject_id):
    store = ModelStore.get()

    if subject_id not in store.subject_map:
        return jsonify({"error": f"Patient {subject_id} not found in ML dataset"}), 404

    window_idx = request.args.get("window_idx", type=int)

    if window_idx is not None:
        key = (subject_id, window_idx)
        if key not in store.idx_map:
            return jsonify({"error": f"window_idx {window_idx} not found for {subject_id}"}), 404
        row_idx = store.idx_map[key]
    else:
        row_idx, _ = store.best_window_for_patient(subject_id)

    if store.shap_3d is None:
        return jsonify({
            "error": "shap_3d.npy not found. Run step_full_analysis.py first."
        }), 503

    shap_vals = store.shap_3d[row_idx]   # (9, 16)
    abs_vals = np.abs(shap_vals)
    vmax = float(abs_vals.max()) or 1e-8

    # Per-channel importance (mean over patches)
    ch_importance = abs_vals.mean(axis=1).tolist()  # (9,)

    # Per-patch importance (mean over channels)
    patch_importance = abs_vals.mean(axis=0).tolist()  # (16,)

    row = store.meta.iloc[row_idx]
    return jsonify({
        "subject_id": subject_id,
        "window_idx": int(row["window_idx"]),
        "risk_prob": round(float(store.all_probs[row_idx]), 4),
        "channels": store.ch_names,
        "n_patches": 16,
        "values": shap_vals.tolist(),        # (9, 16) raw
        "ch_importance": ch_importance,       # (9,) for bar chart
        "patch_importance": patch_importance, # (16,) for timeline
        "vmax": round(vmax, 6),
    })
