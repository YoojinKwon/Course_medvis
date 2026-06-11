# MIMIC-IV 규정 준수 가이드

MedViz 프로젝트의 파일들이 **MIMIC-IV PhysioNet 규정**에 어떻게 준수하는지 분류한 문서입니다.

---

## 📋 MIMIC-IV 규정 요약

**출처**: [PhysioNet MIMIC-IV](https://physionet.org/content/mimic-iv/)

### 핵심 규정

1. **원본 의료 데이터는 공개 불가**
   - 환자 신호, 임상 기록, 메타데이터
   - PhysioNet 계정 있는 사용자만 다운로드 가능
   - 계약서(EULA) 동의 필수

2. **처리된 데이터도 신중하게 다뤄야 함**
   - 익명화된 데이터도 규정 적용
   - 모델 파라미터 공개 시 주의

3. **코드/알고리즘은 공개 가능**
   - 데이터를 포함하지 않는 한
   - 재현 가능한 방식으로 문서화 필수

4. **2차 저작물 제한**
   - MIMIC 데이터로 학습된 모델 공개 시 명시
   - 출처 인용 필수

---

## 🗂️ 파일별 분류

### ✅ 공개 가능 (GitHub에 올려도 됨)

#### 1️⃣ **Flask/FastAPI 코드**

| 파일 | 설명 | 크기 | 이유 |
|------|------|------|------|
| `backend/ml_service/app.py` | Flask 앱 진입점 | 2KB | 순수 코드 |
| `backend/ml_service/routes/risk.py` | 위험도 API | 3KB | 순수 코드 |
| `backend/ml_service/routes/numerics.py` | 시계열 API | 5KB | 순수 코드 |
| `backend/ml_service/routes/shap.py` | SHAP API | 3KB | 순수 코드 |
| `backend/ml_service/routes/similar.py` | 유사도 API | 4KB | 순수 코드 |
| `backend/api/index.py` | FastAPI 예제 | 1KB | 순수 코드 |
| `backend/flask-app/app.py` | Flask Monolith | 5KB | 순수 코드 |
| `backend/test_backend.py` | 테스트 코드 | 1KB | 순수 코드 |

**공개 이유**: 데이터를 포함하지 않는 순수 파이썬 코드

---

#### 2️⃣ **설정 파일 (경로 수정 후)**

| 파일 | 설명 | 크기 | 조치 |
|------|------|------|------|
| `backend/ml_service/config.py` | 경로 설정 | 2KB | **🔒 의료 데이터 경로 제거 후 공개** |
| `backend/vercel.json` | 배포 설정 | 1KB | ✅ 그대로 공개 가능 |

**공개 방법**: config.py의 경로를 placeholder로 변경

---

#### 3️⃣ **문서**

| 파일 | 설명 | 공개 |
|------|------|------|
| `backend/ml_service/README.md` (있으면) | 백엔드 설명 | ✅ |

---

### ❌ 공개 불가능 (GitHub에 올리면 안 됨)

#### 1️⃣ **의료 신호 데이터**

| 파일 | 설명 | 크기 | 규정 |
|------|------|------|------|
| `backend/prepared_v5/windows.npy` | 신호 데이터 | 2.4GB | **원본 의료 데이터 기반** |
| `backend/prepared_v5/shap_3d.npy` | SHAP 값 | 152MB | **처리된 의료 데이터** |
| `database/waveform30.db` | 의료 DB | 1.9GB | **환자 임상 기록** |

**이유**: PhysioNet 규정에 따라 MIMIC 데이터는 다운로드 권한 있는 사용자만 접근

---

#### 2️⃣ **환자 메타데이터**

| 파일 | 설명 | 크기 | 규정 |
|------|------|------|------|
| `backend/prepared_v5/metadata_v2.csv` | 환자 정보 | 16MB | **익명화되었으나 MIMIC 데이터** |
| `backend/prepared_v5/allowed_subjects.json` | 환자 목록 | <1KB | **환자 ID 목록** |

**이유**: 익명화되었지만 MIMIC-IV 규정상 공개 제한

---

#### 3️⃣ **학습된 모델 파일**

| 파일 | 설명 | 크기 | 규정 |
|------|------|------|------|
| `backend/prepared_v5/linear_classifier.pkl` | LR 모델 | 148KB | **MIMIC 데이터로 학습됨** |
| `backend/prepared_v5/linear_faiss.bin` | FAISS 인덱스 | 33MB | **MIMIC 데이터로 생성됨** |

**이유**: MIMIC 데이터로 학습된 모델은 2차 저작물로 간주

---

### ⚠️ 조건부 공개 가능 (설명 포함 시)

| 파일 | 설명 | 조건 |
|------|------|------|
| `backend/prepared_v5/channels.json` | 신호 채널 정의 | 메타데이터만 포함, 데이터 제외 시 ✅ |
| `backend/ml_service/core/model_loader.py` | 모델 로더 | **코드만 공개, 데이터 경로는 사용자가 설정** |

---

## 📝 공개 가능한 파일 체크리스트

```
✅ backend/ml_service/
   ├── app.py                    → 올릴 수 있음
   ├── routes/
   │   ├── risk.py              → 올릴 수 있음
   │   ├── numerics.py          → 올릴 수 있음
   │   ├── shap.py              → 올릴 수 있음
   │   └── similar.py           → 올릴 수 있음
   ├── core/
   │   ├── __init__.py          → 올릴 수 있음
   │   └── model_loader.py      → 올릴 수 있음 (경로 추상화 후)
   └── config.py                → 경로 수정 후 올릴 수 있음

✅ backend/api/
   └── index.py                 → 올릴 수 있음

✅ backend/flask-app/
   ├── app.py                   → 올릴 수 있음
   ├── app_new.py               → 올릴 수 있음
   └── versions/                → 올릴 수 있음

✅ backend/
   ├── test_backend.py          → 올릴 수 있음
   └── vercel.json              → 올릴 수 있음

❌ backend/prepared_v5/
   ├── windows.npy              → 올릴 수 없음 (2.4GB 의료 데이터)
   ├── shap_3d.npy              → 올릴 수 없음 (152MB 처리 데이터)
   ├── metadata_v2.csv          → 올릴 수 없음 (환자 메타데이터)
   ├── linear_classifier.pkl    → 올릴 수 없음 (MIMIC으로 학습된 모델)
   ├── linear_faiss.bin         → 올릴 수 없음 (MIMIC으로 생성된 인덱스)
   ├── allowed_subjects.json    → 올릴 수 없음 (환자 목록)
   └── channels.json            → 조건부 가능 (채널 정의만 포함)

❌ database/
   └── waveform30.db            → 올릴 수 없음 (1.9GB 의료 DB)
```

---

## 🔧 GitHub에 올릴 파일 준비 방법

### Step 1: config.py 수정

**원본** (`backend/ml_service/config.py`):
```python
PREPARED_DIR = ML_SERVICE_DIR.parent / "prepared_v5"
NOTES_DB = ML_SERVICE_DIR.parent.parent / "database" / "waveform30.db"
```

**수정본** (GitHub용):
```python
from pathlib import Path
import os

ML_SERVICE_DIR = Path(__file__).resolve().parent

# 사용자가 직접 설정해야 함 (MIMIC 데이터는 PhysioNet에서 다운로드)
PREPARED_DIR = Path(os.getenv('PREPARED_DIR', '/path/to/prepared_v5'))
NOTES_DB = Path(os.getenv('NOTES_DB', '/path/to/waveform30.db'))

CHANNELS_JSON         = PREPARED_DIR / "channels.json"
METADATA_CSV          = PREPARED_DIR / "metadata_v2.csv"
LINEAR_CLASSIFIER_PKL = PREPARED_DIR / "linear_classifier.pkl"
LINEAR_FAISS_BIN      = PREPARED_DIR / "linear_faiss.bin"
WINDOWS_NPY           = PREPARED_DIR / "windows.npy"
SHAP_NPY              = PREPARED_DIR / "shap_3d.npy"
ALLOWED_SUBJECTS_JSON = PREPARED_DIR / "allowed_subjects.json"

ML_PORT = int(os.getenv('ML_PORT', 5003))
RISK_THRESHOLDS = {"HIGH": 0.60, "MEDIUM": 0.35}
```

### Step 2: 무시할 파일 목록 (`.gitignore`)

```
# MIMIC-IV 데이터 (공개 불가)
backend/prepared_v5/
database/

# 큰 파일
*.npy
*.pkl
*.bin
*.csv
*.db

# 임시
__pycache__/
*.pyc
.env
.env.local
```

### Step 3: README_BACKEND.md 작성

```markdown
# MedViz Backend - ML Service

## 📋 설정

### 데이터 요구사항

이 코드는 **MIMIC-IV** 데이터가 필요합니다:

1. PhysioNet 계정 생성: [physionet.org](https://physionet.org)
2. MIMIC-IV 데이터 다운로드
3. prepared_v5/ 폴더 준비 (2.6GB)

### 실행

```bash
export PREPARED_DIR=/path/to/prepared_v5
export NOTES_DB=/path/to/waveform30.db

python backend/ml_service/app.py
```

## 📄 파일 설명

- `app.py`: Flask 앱 메인 파일
- `routes/`: API 엔드포인트
- `config.py`: 설정 (환경변수 사용)
- `core/model_loader.py`: 모델 로더

## 주의

MIMIC-IV 데이터는 PhysioNet 규정에 따라 관리됩니다.
```

---

## 📊 요약

### GitHub에 올릴 파일

```
✅ 올릴 수 있음 (약 50KB)
backend/
├── ml_service/
│   ├── app.py
│   ├── config.py (수정됨)
│   ├── core/
│   │   ├── __init__.py
│   │   └── model_loader.py
│   └── routes/
│       ├── __init__.py
│       ├── risk.py
│       ├── numerics.py
│       ├── shap.py
│       └── similar.py
├── api/
│   └── index.py
├── flask-app/
│   ├── app.py
│   ├── app_new.py
│   └── versions/
├── test_backend.py
├── vercel.json
└── requirements.txt
```

### GitHub에 올리면 안 됨

```
❌ 올릴 수 없음 (약 4.5GB)
backend/
├── prepared_v5/           ← MIMIC 데이터 기반 (2.6GB)
└── database/              ← 의료 DB (1.9GB)
```

---

## 🔗 참고 자료

- **MIMIC-IV**: https://physionet.org/content/mimic-iv/
- **PhysioNet 규정**: https://physionet.org/about/agreements/
- **데이터 사용 약관**: https://physionet.org/docs/guidelines/

---

## ❓ FAQ

**Q: 왜 의료 데이터는 공개하면 안 되나요?**
A: HIPAA 규정과 환자 개인정보 보호를 위함. PhysioNet 계약서 동의 필수.

**Q: 학습된 모델은 공개할 수 없나요?**
A: MIMIC 데이터로 학습된 모델은 2차 저작물로 간주되어 규정 적용.

**Q: 채널 정의 (channels.json)는 공개 가능한가요?**
A: 네, 메타데이터만 포함하므로 공개 가능합니다.

**Q: 사용자가 MIMIC 데이터를 사용하려면?**
A: PhysioNet에서 다운로드 후 환경변수로 경로 설정.

---

최종 업데이트: 2026-06-11
