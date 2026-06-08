import pickle, json
import numpy as np
import pandas as pd
import faiss
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    PREPARED_DIR, WINDOWS_NPY, METADATA_CSV, CHANNELS_JSON,
    LINEAR_CLASSIFIER_PKL, LINEAR_FAISS_BIN, SHAP_NPY,
    RISK_THRESHOLDS, ALLOWED_SUBJECTS_JSON,
)

PROB_BATCH = 2000   # 배치 크기 (메모리 절약)

REQUIRED_FILES = [
    METADATA_CSV, CHANNELS_JSON, LINEAR_CLASSIFIER_PKL,
    LINEAR_FAISS_BIN, WINDOWS_NPY, SHAP_NPY, ALLOWED_SUBJECTS_JSON,
]


def _check_prepared_dir():
    missing = [p.name for p in REQUIRED_FILES if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"{PREPARED_DIR} 에서 다음 파일을 찾을 수 없습니다: {missing}\n"
            f"  prepared_v5/ 는 용량(약 2.6GB) 문제로 git에 포함되지 않았습니다.\n"
            f"  전달받은 prepared_v5 폴더 전체를 Course_medvis와 같은 위치(형제 디렉토리)에 배치하세요.\n"
            f"  자세한 안내: ml_service/README.md"
        )


class ModelStore:
    _instance = None

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        print("[ML Service] Loading models...", flush=True)
        _check_prepared_dir()

        # --- metadata ---
        self.meta = pd.read_csv(METADATA_CSV)
        self.meta = self.meta.dropna(subset=["label"]).reset_index(drop=True)
        self.meta["label"]      = self.meta["label"].astype(int)
        self.meta["window_idx"] = self.meta["window_idx"].astype(int)

        self.idx_map = {
            (row.subject_id, int(row.window_idx)): i
            for i, row in self.meta.iterrows()
        }
        self.subject_map: dict[str, list[int]] = {}
        for i, row in self.meta.iterrows():
            self.subject_map.setdefault(row.subject_id, []).append(i)

        # --- linear classifier (raw 9×512 → flatten → LR) ---
        print("  Loading linear_classifier.pkl...", flush=True)
        with open(LINEAR_CLASSIFIER_PKL, "rb") as f:
            ckpt = pickle.load(f)
        self.clf    = ckpt["clf"]
        self.scaler = ckpt["scaler"]
        print(f"  linear clf AUC(CV): {ckpt['auc_cv'].mean():.3f}", flush=True)

        # --- windows (필요: numerics + risk 계산) ---
        print("  Loading windows.npy...", flush=True)
        self._windows = np.load(WINDOWS_NPY)       # (N, 9, 512)
        N = len(self._windows)

        # --- 위험 확률 사전 계산 (배치, 메모리 절약) ---
        print("  Computing risk probabilities (linear, batched)...", flush=True)
        probs = []
        for start in range(0, N, PROB_BATCH):
            batch = self._windows[start:start + PROB_BATCH]           # (B, 9, 512)
            X_flat = batch.reshape(len(batch), -1).astype(np.float32) # (B, 4608)
            X_s    = self.scaler.transform(X_flat)
            probs.append(self.clf.predict_proba(X_s)[:, 1])
        self.all_probs = np.concatenate(probs).astype(np.float32)

        # --- FAISS (Linear: 표준화된 raw feature -> PCA(64) -> L2정규화 임베딩) ---
        # MOMENT가 아직 fine-tuning 중이라, 유사도 검색은 linear 모델의 PCA 임베딩을 사용한다.
        # IndexFlatIP는 reconstruct()로 저장된 벡터를 그대로 복원할 수 있어
        # 별도의 임베딩 배열을 저장/로딩할 필요가 없다.
        print("  Loading linear_faiss.bin...", flush=True)
        self.faiss_index = faiss.read_index(str(LINEAR_FAISS_BIN))

        # --- 유사 신호 검색 후보군: 지정된 환자만 사용 ---
        # subject_id는 MIMIC-IV 파생 식별자라 코드(공개 저장소)에 두지 않고
        # prepared_v5/allowed_subjects.json (직접 전달) 에서 읽는다.
        # IndexFlatIP에 저장된 정규화 임베딩을 reconstruct로 복원해 두면,
        # 검색 시점에는 이 부분집합에 대해서만 내적(코사인 유사도)을 계산하면 된다.
        with open(ALLOWED_SUBJECTS_JSON) as f:
            allowed_subject_ids = json.load(f)
        allowed_rows = [
            i for sid in allowed_subject_ids for i in self.subject_map.get(sid, [])
        ]
        self.allowed_rows     = np.array(allowed_rows, dtype=np.int64)
        self.allowed_subjects = self.meta["subject_id"].to_numpy()[self.allowed_rows]
        self.allowed_embs     = np.vstack(
            [self.faiss_index.reconstruct(int(r)) for r in self.allowed_rows]
        ) if len(self.allowed_rows) else np.empty((0, self.faiss_index.d), dtype=np.float32)

        # --- channels ---
        with open(CHANNELS_JSON) as f:
            self.channels = json.load(f)
        self.ch_names = [c.split(" [")[0].strip() for c in self.channels]

        # --- SHAP (사전 계산: 1초 단위 → 16 패치 평균) ---
        self.shap_3d = np.load(SHAP_NPY) if SHAP_NPY.exists() else None

        print(f"  metadata : {N} windows, {self.meta['subject_id'].nunique()} patients", flush=True)
        print(f"  FAISS    : {self.faiss_index.ntotal} vectors (Linear PCA embedding)", flush=True)
        print(f"  SHAP     : {'available' if self.shap_3d is not None else 'NOT FOUND'}", flush=True)

    def query_embedding(self, row_idx: int) -> np.ndarray:
        """FAISS 인덱스에 저장된 정규화 임베딩을 그대로 복원해 쿼리 벡터로 사용"""
        return self.faiss_index.reconstruct(int(row_idx)).reshape(1, -1)

    @property
    def windows(self):
        return self._windows   # 이미 로드됨

    def prob_to_level(self, prob: float) -> str:
        if prob >= RISK_THRESHOLDS["HIGH"]:
            return "HIGH"
        if prob >= RISK_THRESHOLDS["MEDIUM"]:
            return "MEDIUM"
        return "LOW"

    def best_window_for_patient(self, subject_id: str) -> tuple[int, float]:
        rows = self.subject_map.get(subject_id, [])
        if not rows:
            return None, None
        best = int(np.argmax(self.all_probs[rows]))
        row_idx = rows[best]
        return row_idx, float(self.all_probs[row_idx])
