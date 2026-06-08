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
    q_emb = store.query_embedding(q_row).reshape(-1)   # (d,), L2-정규화됨

    # 후보군: 지정된 30명 환자의 윈도우 중 쿼리 환자 자신은 제외
    keep = store.allowed_subjects != subject_id
    rows = store.allowed_rows[keep]
    embs = store.allowed_embs[keep]

    results = []
    if len(rows) > 0:
        sims = embs @ q_emb   # 내적 = 코사인 유사도 (둘 다 정규화된 벡터)
        order = np.argsort(-sims)[:top_k]

        for rank in order:
            nb = int(rows[rank])
            sc = float(sims[rank])
            nb_meta = store.meta.iloc[nb]

            prob = float(store.all_probs[nb])
            level = store.prob_to_level(prob)
            highlight = _highlight_from_shap(store, nb)

            results.append({
                "id": f"{nb_meta['subject_id']}_w{int(nb_meta['window_idx'])}",
                "patient_id": nb_meta["subject_id"],
                "window_idx": int(nb_meta["window_idx"]),
                "similarity_score": round(sc, 4),
                "risk_level": level,
                "risk_prob": round(prob, 4),
                "label": int(nb_meta["label"]),
                "highlight_region": highlight,
                "admission_reason": "ICU 모니터링",
                "note": f"Window #{int(nb_meta['window_idx'])}, Risk prob: {round(prob, 2)}",
            })

    return jsonify({
        "subject_id": subject_id,
        "query_window_idx": int(store.meta.iloc[q_row]["window_idx"]),
        "query_risk_prob": round(q_prob, 4),
        "results": results,
    })
