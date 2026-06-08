from pathlib import Path

ML_SERVICE_DIR = Path(__file__).resolve().parent

# MIMIC-IV에서 파생된 데이터(metadata/모델/임베딩 등)는 PhysioNet 데이터 사용 약관상
# public 저장소에 커밋하지 않고, prepared_v5/ 폴더 전체를 직접 전달받아 배치한다.
# Course_medvis 저장소와 같은 위치(형제 디렉토리)의 prepared_v5/ 를 바라봄:
#   code/
#   ├── Course_medvis/   <- 이 저장소 (git)
#   └── prepared_v5/     <- 직접 전달받아 배치 (git에 포함되지 않음)
# ml_service -> backend -> Course_medvis -> code
CODE_ROOT    = ML_SERVICE_DIR.parents[2]
PREPARED_DIR = CODE_ROOT / "prepared_v5"

CHANNELS_JSON         = PREPARED_DIR / "channels.json"
METADATA_CSV          = PREPARED_DIR / "metadata_v2.csv"
LINEAR_CLASSIFIER_PKL = PREPARED_DIR / "linear_classifier.pkl"  # raw features -> LR (+scaler)
LINEAR_FAISS_BIN      = PREPARED_DIR / "linear_faiss.bin"       # PCA(64) of scaled raw features
WINDOWS_NPY           = PREPARED_DIR / "windows.npy"            # 2.4GB
SHAP_NPY              = PREPARED_DIR / "shap_3d.npy"            # 152MB

# 유사 신호 검색(faiss) 결과를 제한할 환자 목록.
# 환자 subject_id는 MIMIC-IV 파생 식별자이므로 public 저장소에 커밋하지 않고
# prepared_v5/ 와 함께 직접 전달받는 JSON 파일에서 읽는다 (예: ["p12345678", ...]).
ALLOWED_SUBJECTS_JSON = PREPARED_DIR / "allowed_subjects.json"

ML_PORT = 5003

RISK_THRESHOLDS = {"HIGH": 0.60, "MEDIUM": 0.35}  # prob >= HIGH → HIGH, else MEDIUM, else LOW
