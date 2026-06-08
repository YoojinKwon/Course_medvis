from flask import Blueprint, jsonify, request
from core.model_loader import ModelStore
import numpy as np

bp = Blueprint("similar", __name__)


def _highlight_from_shap(store, row_idx: int) -> dict:
    if store.shap_3d is None:
        return {"start": 0.5, "end": 1.0, "description": "후반부"}
    shap = store.shap_3d[row_idx]      # (9, 16)
    patch_importance = np.abs(shap).mean(axis=0)   # (16,)
    top_patch = int(np.argmax(patch_importance))
    return {
        "start": round(top_patch / 16, 4),
        "end":   round((top_patch + 1) / 16, 4),
        "description": f"Patch {top_patch + 1}/16 고위험",
    }


@bp.route("/api/ml/similar/<subject_id>")
def similar_signals(subject_id):
    store = ModelStore.get()
    top_k = int(request.args.get("top_k", 5))

    if subject_id not in store.subject_map:
        return jsonify({"error": f"Patient {subject_id} not found in ML dataset"}), 404

    q_row, q_prob = store.best_window_for_patient(subject_id)
    q_emb = store.query_embedding(q_row)

    # Search more than top_k to account for filtering
    scores, nbrs = store.faiss_index.search(q_emb, top_k * 4)

    results = []
    for nb, sc in zip(nbrs[0], scores[0]):
        if int(nb) == q_row:
            continue
        nb_meta = store.meta.iloc[nb]
        if nb_meta["subject_id"] == subject_id:
            continue  # skip same patient

        prob = float(store.all_probs[nb])
        level = store.prob_to_level(prob)
        highlight = _highlight_from_shap(store, nb)

        results.append({
            "id": f"{nb_meta['subject_id']}_w{int(nb_meta['window_idx'])}",
            "patient_id": nb_meta["subject_id"],
            "window_idx": int(nb_meta["window_idx"]),
            "similarity_score": round(float(sc), 4),
            "risk_level": level,
            "risk_prob": round(prob, 4),
            "label": int(nb_meta["label"]),
            "highlight_region": highlight,
            "admission_reason": "ICU 모니터링",
            "note": f"Window #{int(nb_meta['window_idx'])}, Risk prob: {round(prob, 2)}",
        })

        if len(results) >= top_k:
            break

    return jsonify({
        "subject_id": subject_id,
        "query_window_idx": int(store.meta.iloc[q_row]["window_idx"]),
        "query_risk_prob": round(q_prob, 4),
        "results": results,
    })
