import sys
from pathlib import Path

# Ensure ml_service/ root is on path for route imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import Flask, jsonify
from flask_cors import CORS

from core.model_loader import ModelStore
from routes.risk import bp as risk_bp
from routes.similar import bp as similar_bp
from routes.shap import bp as shap_bp
from routes.numerics import bp as numerics_bp
from config import ML_PORT

app = Flask(__name__)
CORS(app)

app.register_blueprint(risk_bp)
app.register_blueprint(similar_bp)
app.register_blueprint(shap_bp)
app.register_blueprint(numerics_bp)


@app.route("/api/ml/health")
def health():
    store = ModelStore.get()
    return jsonify({
        "status": "ok",
        "service": "ml_service",
        "port": ML_PORT,
        "n_windows": len(store.meta),
        "n_patients": store.meta["subject_id"].nunique(),
        "shap_available": store.shap_3d is not None,
    })


@app.route("/api/ml/patients")
def list_patients():
    store = ModelStore.get()
    patients = []
    for sid, rows in store.subject_map.items():
        best_idx = rows[int(store.all_probs[rows].argmax())]
        prob = float(store.all_probs[best_idx])
        patients.append({
            "subject_id": sid,
            "n_windows": len(rows),
            "risk_prob": round(prob, 4),
            "risk_level": store.prob_to_level(prob),
        })
    patients.sort(key=lambda x: x["risk_prob"], reverse=True)
    return jsonify({"patients": patients})


if __name__ == "__main__":
    ModelStore.get()
    print(f"\n[ML Service] Running on http://localhost:{ML_PORT}", flush=True)
    app.run(host="0.0.0.0", port=ML_PORT, debug=False)
