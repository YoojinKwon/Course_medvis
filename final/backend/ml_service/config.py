from pathlib import Path
import os

ML_SERVICE_DIR = Path(__file__).resolve().parent

# ============================================================
# MIMIC-IV 데이터 경로 설정
# ============================================================
# MIMIC-IV 데이터는 PhysioNet 규정에 따라 보호됩니다.
# 사용자가 다음 경로를 환경변수로 지정해야 합니다:
#
#   export PREPARED_DIR=/path/to/prepared_v5
#   export NOTES_DB=/path/to/waveform30.db
#
# prepared_v5/ 폴더 구조:
#   - channels.json: 신호 채널 정의
#   - metadata_v2.csv: 환자 메타데이터
#   - linear_classifier.pkl: LR 모델
#   - linear_faiss.bin: FAISS 인덱스
#   - windows.npy: 신호 데이터 (2.4GB)
#   - shap_3d.npy: SHAP 값 (152MB)
#   - allowed_subjects.json: 허용 환자 목록
#
# ============================================================

# 환경변수에서 경로 읽기 (없으면 기본값)
PREPARED_DIR = Path(os.getenv(
    'PREPARED_DIR',
    ML_SERVICE_DIR.parent / "prepared_v5"
))

NOTES_DB = Path(os.getenv(
    'NOTES_DB',
    ML_SERVICE_DIR.parent.parent / "database" / "waveform30.db"
))

# 데이터 파일 경로
CHANNELS_JSON         = PREPARED_DIR / "channels.json"
METADATA_CSV          = PREPARED_DIR / "metadata_v2.csv"
LINEAR_CLASSIFIER_PKL = PREPARED_DIR / "linear_classifier.pkl"
LINEAR_FAISS_BIN      = PREPARED_DIR / "linear_faiss.bin"
WINDOWS_NPY           = PREPARED_DIR / "windows.npy"            # 2.4GB
SHAP_NPY              = PREPARED_DIR / "shap_3d.npy"            # 152MB
ALLOWED_SUBJECTS_JSON = PREPARED_DIR / "allowed_subjects.json"

# 포트 설정 (환경변수 또는 기본값)
ML_PORT = int(os.getenv('ML_PORT', 5003))

# 위험도 임계값
RISK_THRESHOLDS = {"HIGH": 0.60, "MEDIUM": 0.35}
