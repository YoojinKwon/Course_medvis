# MedViz Backend - ML Service

**주의**: MIMIC-IV 데이터는 공개 저장소에 포함되지 않습니다.

## 📋 파일 설명

### ml_service/ (Flask)

- `app.py`: Flask 메인 앱
- `config.py`: 경로 & 포트 설정 (환경변수 사용)
- `core/model_loader.py`: 모델 로더 (싱글톤)
- `routes/`: API 엔드포인트
  - `risk.py`: 위험도 예측
  - `numerics.py`: 시계열 데이터
  - `shap.py`: SHAP 값
  - `similar.py`: 유사 환자 검색

### api/ (FastAPI)

- `index.py`: FastAPI 예제 (미사용)

### flask-app/ (Legacy)

- `app.py`, `app_new.py`: Flask Monolith (개발용, 미사용)
- `versions/`: 버전 히스토리

## 🔧 실행 방법

### 1. MIMIC 데이터 준비

```bash
# PhysioNet에서 다운로드
# https://physionet.org/content/mimic-iv/

# 디렉토리 구조
prepared_v5/
├── channels.json
├── metadata_v2.csv
├── linear_classifier.pkl
├── linear_faiss.bin
├── windows.npy
├── shap_3d.npy
└── allowed_subjects.json

database/
└── waveform30.db
```

### 2. 환경 설정

```bash
export PREPARED_DIR=/path/to/prepared_v5
export NOTES_DB=/path/to/database/waveform30.db
export ML_PORT=5003
```

### 3. 실행

```bash
pip install -r requirements.txt
python ml_service/app.py
```

## 📄 MIMIC 규정

자세한 내용은 [MIMIC_COMPLIANCE.md](../MIMIC_COMPLIANCE.md) 참고

- ✅ 올릴 수 있는 파일: 코드 (routes/, config.py 등)
- ❌ 올릴 수 없는 파일: 의료 데이터 (prepared_v5/, database/)

## 🔗 참고

- MIMIC-IV: https://physionet.org/content/mimic-iv/
- PhysioNet: https://physionet.org/

---

**마지막 업데이트**: 2026-06-11
