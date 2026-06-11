from flask import Blueprint, jsonify, request
from core.model_loader import ModelStore

bp = Blueprint("risk", __name__)


@bp.route("/api/ml/risk/<subject_id>")
def patient_risk(subject_id):
    store = ModelStore.get()

    if subject_id not in store.subject_map:
        return jsonify({"error": f"Patient {subject_id} not found in ML dataset"}), 404

    window_rank = request.args.get("window_rank", type=int, default=None)

    rows = store.subject_map[subject_id]

    if window_rank is not None:
        # Sort by window_idx (time order), clamp to available count
        rows_sorted = sorted(rows, key=lambda i: int(store.meta.iloc[i]["window_idx"]))
        rank = min(window_rank, len(rows_sorted) - 1)
        row_idx = rows_sorted[rank]
        prob = float(store.all_probs[row_idx])
        total_windows = len(rows_sorted)
    else:
        row_idx, prob = store.best_window_for_patient(subject_id)
        total_windows = len(rows)

    level = store.prob_to_level(prob)
    row = store.meta.iloc[row_idx]

    # Get clinical notes from DB
    clinical_notes = store.get_clinical_notes(subject_id)

    return jsonify({
        "subject_id": subject_id,
        "risk_prob": round(prob, 4),
        "risk_level": level,
        "window_idx": int(row["window_idx"]),
        "window_rank": window_rank if window_rank is not None else "best",
        "total_windows": total_windows,
        "label": int(row["label"]),
        "clinical_notes": clinical_notes,  # ← 새로 추가
    })
