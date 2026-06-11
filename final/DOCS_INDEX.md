# MedViz ICU Monitor - 문서 완전 가이드

**MedViz** 프로젝트의 모든 문서, 리소스, 그리고 개발 정보를 한눈에 볼 수 있는 인덱스입니다.

---

## 📚 문서 맵

### 🎯 새 사용자 시작하기

| 문서 | 목적 | 읽는 시간 |
|------|------|---------|
| 👉 [SETUP.md](SETUP.md) | **설치 & 실행** - 처음 시작하는 사용자 필독 | 15분 |
| 📖 [README.md](README.md) | 프로젝트 개요 | 5분 |
| 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 구조 이해 | 25분 |
| 🔌 [API_REFERENCE.md](API_REFERENCE.md) | API 상세 명세 | 20분 |
| 🎨 [CUSTOMIZATION.md](CUSTOMIZATION.md) | **개인 환경 커스터마이징** | 20분 |

---

## 📖 각 문서 상세 설명

### 0️⃣ **[CUSTOMIZATION.md](CUSTOMIZATION.md)** - 개인 환경 커스터마이징

**읽어야 할 사람**: 
- 프로젝트를 자신의 경로로 이동하려는 사람
- 포트를 변경하고 싶은 사람
- 프로젝트 이름을 바꾸고 싶은 사람
- 개발/배포 환경을 설정하고 싶은 사람

**포함 내용**:
- ✅ 프로젝트 경로 변경 (이동, 복사, 심볼릭 링크)
- ✅ 포트 번호 커스터마이징 (5003 → 8000 등)
- ✅ 프로젝트 이름 변경 (MedViz_claude → MyICUMonitor)
- ✅ 데이터 경로 설정 (외부 위치 데이터 사용)
- ✅ 개발 환경 (Python 가상환경, VS Code 설정, Git)
- ✅ 배포 환경 (환경 변수, Docker, Nginx)
- ✅ 문제 해결 & 체크리스트

**빠른 요약**:
```bash
# 1. 프로젝트를 새 위치로 이동
mv ~/Documents/.../MedViz_claude ~/Projects/MedViz

# 2. 포트 변경 (config.py + icudata.js 수정)
ML_PORT = 8000

# 3. 가상환경 설정 (권장)
python -m venv venv
source venv/bin/activate
```

---

### 1. **[SETUP.md](SETUP.md)** - 설치 및 실행 가이드

**읽어야 할 사람**: 
- 처음 시작하는 사람
- 개발 환경 세팅이 필요한 사람
- 포트 설정 또는 문제 해결이 필요한 사람

**포함 내용**:
- ✅ 시스템 요구사항 (Python 3.8+, 8GB RAM)
- ✅ 단계별 설치 (pip install)
- ✅ 3가지 실행 방법:
  - 표준 실행 (터미널 3개)
  - 자동 시작 스크립트
  - Docker
- ✅ 포트 설정 및 변경
- ✅ 문제 해결 가이드 (FAQ)
- ✅ 성능 확인 방법

**빠른 요약**:
```bash
# 1. 의존성 설치
pip install flask flask-cors numpy pandas scikit-learn faiss-cpu

# 2. 터미널 1: ML Service
cd backend/ml_service
python app.py

# 3. 터미널 2: 프론트엔드
cd frontend
python -m http.server 3000

# 4. 브라우저에서
http://localhost:3000/MedViz%20ICU.html
```

---

### 2. **[README.md](README.md)** - 프로젝트 개요

**읽어야 할 사람**: 
- 프로젝트 전체 개요를 알고 싶은 사람
- 기술 스택과 주요 기능을 알고 싶은 사람

**포함 내용**:
- ✅ 프로젝트 설명
- ✅ 폴더 구조
- ✅ 기술 스택
- ✅ 주요 기능
- ✅ 데이터 구조

**핵심 정보**:
```
기술 스택:
- Backend: Flask + scikit-learn + FAISS
- Frontend: React 18.3 + Babel (in-browser transpilation)
- Data: MIMIC-IV waveform database
- Database: SQLite

주요 기능:
- 6명 ICU 환자 모니터링
- 9개 신호 채널 실시간 시각화
- 위험도 예측 (LR 모델)
- 유사 환자 검색 (FAISS)
- SHAP 기반 설명 가능성
```

---

### 3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - 기술 아키텍처

**읽어야 할 사람**: 
- 시스템 구조를 깊게 이해하고 싶은 개발자
- 새로운 기능을 추가하려는 개발자
- 성능 최적화를 하려는 사람

**포함 내용**:
- ✅ 전체 아키텍처 다이어그램
- ✅ 상세 폴더 구조 설명
- ✅ 백엔드 상세:
  - ModelStore 싱글톤 구조
  - API 엔드포인트 설명
  - 데이터 로드 흐름
- ✅ 프론트엔드 상세:
  - React 상태 관리
  - 페이지별 구조 (Ward, Detail)
  - 컴포넌트 계층도
  - 신호 시각화 (Canvas 기반)
- ✅ 개발 가이드 (포트 변경, API 추가, 라우팅)
- ✅ 성능 최적화 방법

**주요 다이어그램**:
```
사용자 브라우저
    ↓
Frontend (React, 포트 3000)
    ↓
API 요청 (HTTP)
    ↓
ML Service Backend (Flask, 포트 5003)
    ↓
데이터 소스 (prepared_v5/, waveform30.db)
```

---

### 4. **[API_REFERENCE.md](API_REFERENCE.md)** - API 완전 명세

**읽어야 할 사람**: 
- 백엔드 API와 통합하려는 개발자
- API 엔드포인트를 사용하려는 사람
- 모바일 앱 등 다른 클라이언트를 개발하려는 사람

**포함 내용**:
- ✅ 6개 API 엔드포인트 완전 설명:
  1. `GET /api/ml/health` - 헬스체크
  2. `GET /api/ml/patients` - 환자 목록
  3. `GET /api/ml/risk/{sid}` - 위험도 예측
  4. `GET /api/ml/numerics/{sid}` - 시계열 데이터
  5. `GET /api/ml/shap/{sid}` - SHAP 설명 가능성
  6. `GET /api/ml/similar/{sid}` - 유사 환자 검색
- ✅ 각 엔드포인트별:
  - 목적
  - 요청 파라미터
  - 응답 구조 (예시 JSON)
  - 에러 코드
- ✅ Python, JavaScript, cURL 사용 예제
- ✅ 성능 팁 및 FAQ

**예제**:
```bash
# 환자 위험도 조회
curl http://localhost:5003/api/ml/risk/p14629329 | jq

# 시계열 데이터
curl http://localhost:5003/api/ml/numerics/p14629329 | jq

# 유사 환자 (상위 5명)
curl 'http://localhost:5003/api/ml/similar/p14629329?top_k=5' | jq
```

---

## 🗂️ 파일 구조 완전 설명

```
MedViz_claude/                              # 프로젝트 루트
│
├── 📄 문서 파일
│   ├── README.md                          # 프로젝트 개요 ⭐
│   ├── SETUP.md                           # 설치 & 실행 가이드 ⭐
│   ├── CUSTOMIZATION.md                   # 개인 환경 커스터마이징 ⭐
│   ├── ARCHITECTURE.md                    # 기술 아키텍처 설명 ⭐
│   ├── API_REFERENCE.md                   # API 완전 명세 ⭐
│   └── DOCS_INDEX.md                      # 문서 인덱스 (현재 파일)
│
├── 🎨 프론트엔드
│   ├── MedViz ICU.html                   # 메인 HTML 진입점
│   ├── index.html                         # 검색 페이지 (백업)
│   ├── icuapp.jsx                         # React 메인 앱 (라우팅, 상태)
│   ├── icudata.js                         # 데이터 로더 (API 호출)
│   ├── icoms.jsx                          # 공유 컴포넌트 (Icon, RiskBadge, TrendWave)
│   ├── ward.jsx                           # 페이지 1: 병실 그리드
│   ├── detail.jsx                         # 페이지 2: 환자 상세
│   └── icu.css                            # 스타일시트
│
├── 🔧 백엔드
│   ├── ml_service/                        # ⭐ ML 백엔드 (Flask)
│   │   ├── app.py                         # Flask 앱 (라우트 등록)
│   │   ├── config.py                      # 설정 (포트, 경로)
│   │   ├── core/
│   │   │   └── model_loader.py            # ModelStore 싱글톤
│   │   └── routes/
│   │       ├── risk.py                    # GET /api/ml/risk/
│   │       ├── numerics.py                # GET /api/ml/numerics/
│   │       ├── shap.py                    # GET /api/ml/shap/
│   │       └── similar.py                 # GET /api/ml/similar/
│   │
│   ├── prepared_v5/                       # ⭐ ML 모델 (2.6GB)
│   │   ├── channels.json                  # 신호 채널 정의
│   │   ├── metadata_v2.csv                # 환자 메타데이터
│   │   ├── linear_classifier.pkl          # LR 분류 모델
│   │   ├── linear_faiss.bin               # FAISS 인덱스
│   │   ├── windows.npy                    # 신호 데이터 (2.4GB)
│   │   ├── shap_3d.npy                    # SHAP 값 (152MB)
│   │   └── allowed_subjects.json          # 허용 환자 목록
│   │
│   ├── api/                               # FastAPI (미사용)
│   │   └── index.py
│   │
│   └── flask-app/                         # Flask Monolith (미사용)
│
├── 📊 데이터
│   ├── database/
│   │   └── waveform30.db                  # SQLite (임상 노트)
│   └── __pycache__/
│
├── 🎯 레거시 파일
│   ├── app.jsx                            # 레거시
│   ├── components.jsx
│   ├── data.js
│   ├── rag.jsx
│   ├── ragpage.jsx
│   ├── styles.css
│   ├── tweaks-panel.jsx
│   └── MedViz Dashboard.html
│
└── 📌 설정 파일
    ├── MedViz_claude.code-workspace       # VS Code workspace
    └── .DS_Store
```

---

## 🚀 빠른 시작 (5분)

### 1️⃣ 설치 (1분)

```bash
cd MedViz_claude
pip install flask flask-cors numpy pandas scikit-learn faiss-cpu
```

### 2️⃣ 실행 (터미널 3개, 각 1분)

**터미널 1**:
```bash
cd backend/ml_service
python app.py
```

**터미널 2**:
```bash
cd frontend
python -m http.server 3000
```

**터미널 3** (또는 브라우저):
```bash
open http://localhost:3000/MedViz%20ICU.html
```

### 3️⃣ 확인 (1분)

```bash
# API 확인
curl http://localhost:5003/api/ml/health | jq

# 브라우저에서
# → "병실" 페이지: 6명 환자 목록
# → 환자 클릭: "상세" 페이지로 이동
# → 9개 신호 채널 확인
```

---

## 🔍 용도별 가이드

### 💡 "시스템이 어떻게 작동하는지 알고 싶어요"

1. [README.md](README.md) - 프로젝트 개요 (5분)
2. [ARCHITECTURE.md](ARCHITECTURE.md) - 시스템 구조 (25분)
3. [API_REFERENCE.md](API_REFERENCE.md) - API 흐름 (20분)

### 🛠️ "내 환경에 설치하고 실행하고 싶어요"

1. [SETUP.md](SETUP.md) - 단계별 설치 (15분)
2. 터미널에서 명령어 실행
3. [문제 해결](SETUP.md#문제-해결) 섹션 참고

### 📱 "모바일 앱/웹 서비스를 만들고 싶어요"

1. [API_REFERENCE.md](API_REFERENCE.md) - API 명세 숙독 (20분)
2. Python/JavaScript 예제 코드 참고
3. [ARCHITECTURE.md](ARCHITECTURE.md) - 데이터 구조 이해 (10분)

### 🎯 "새로운 기능을 추가하고 싶어요"

1. [ARCHITECTURE.md](ARCHITECTURE.md) - 개발 가이드 섹션 (15분)
2. 포트 변경, API 추가 예제 참고
3. 기존 코드 구조 학습

### 🐛 "문제가 발생했어요"

→ [SETUP.md - 문제 해결](SETUP.md#문제-해결) 섹션으로 이동

---

## 💾 주요 데이터

### 환자 데이터

| 항목 | 값 | 설명 |
|------|-----|------|
| **총 환자 수** | 185명 | MIMIC-IV 데이터 |
| **시계열 윈도우** | 137,961개 | 30분 단위 시점 |
| **신호 채널** | 9개 | HR, SpO2, RR, BP, QT 등 |
| **시계열 길이** | 512 포인트 | 다운샘플링됨 |
| **데이터 범위** | 2008-2019 | 과거 데이터 |

### 파일 크기

| 파일 | 크기 | 용도 |
|------|------|------|
| `windows.npy` | 2.4GB | 신호 데이터 |
| `shap_3d.npy` | 152MB | SHAP 값 |
| `linear_faiss.bin` | 33MB | FAISS 인덱스 |
| `waveform30.db` | 1.9GB | 임상 노트 |
| **총합** | ~4.5GB | - |

---

## 🔗 관련 리소스

### 외부 링크

- 📊 **MIMIC-IV Dataset**: [physionet.org/content/mimic-iv-waveform](https://physionet.org/content/mimic-iv-waveform/)
- 📚 **Flask 문서**: [flask.palletsprojects.com](https://flask.palletsprojects.com/)
- 🔍 **FAISS 문서**: [github.com/facebookresearch/faiss](https://github.com/facebookresearch/faiss)
- 🎨 **React 문서**: [react.dev](https://react.dev/)

### 라이선스

- **MIMIC-IV**: PhysioNet, MIT-LCP
- **MedViz**: 교육 및 연구 목적 (실제 임상 사용 불가)

---

## ✅ 체크리스트

### 처음 설정할 때

- [ ] [SETUP.md](SETUP.md) 읽기
- [ ] Python 3.8+ 설치 확인
- [ ] 의존성 설치 (`pip install flask ...`)
- [ ] 데이터 파일 다운로드 (prepared_v5/, waveform30.db)
- [ ] 3개 서비스 실행 (ml_service, frontend, browser)
- [ ] http://localhost:3000/MedViz%20ICU.html 접속 확인

### 개발 시작 전

- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) 읽기
- [ ] 프로젝트 폴더 구조 이해
- [ ] 주요 파일 위치 파악 (icuapp.jsx, app.py, routes/)
- [ ] API 엔드포인트 이해 ([API_REFERENCE.md](API_REFERENCE.md))

### 새 기능 추가 전

- [ ] [ARCHITECTURE.md - 개발 가이드](ARCHITECTURE.md#개발-가이드) 섹션 검토
- [ ] 유사한 기능의 기존 코드 분석
- [ ] API 변경 사항 계획
- [ ] 프론트엔드/백엔드 변경 사항 계획

---

## 📞 지원 & FAQ

### 자주 묻는 질문

**Q: 설치가 안 돼요**
→ [SETUP.md - 문제 해결](SETUP.md#문제-해결) 참고

**Q: API를 어떻게 사용하나요?**
→ [API_REFERENCE.md](API_REFERENCE.md) 참고

**Q: 포트를 변경하고 싶어요**
→ [ARCHITECTURE.md - 포트 변경](ARCHITECTURE.md#포트-변경-예-5003--5004) 참고

**Q: 느려요 (로드 시간이 오래)**
→ [SETUP.md - 성능 확인](SETUP.md#성능-확인) 참고

### 추가 질문

문제가 해결되지 않으면:
1. [SETUP.md - 문제 해결](SETUP.md#문제-해결) 완독
2. 터미널 로그 확인 ([ERROR] 메시지)
3. 브라우저 콘솔 확인 (F12 → Console)
4. 네트워크 탭 확인 (F12 → Network)

---

## 🎯 학습 경로

### 초급 (1-2시간)

1. [README.md](README.md) 읽기
2. [CUSTOMIZATION.md](CUSTOMIZATION.md) - 프로젝트 경로 설정
3. [SETUP.md](SETUP.md) - 설치 & 실행
4. 브라우저에서 UI 조작해보기

### 중급 (3-4시간)

1. [CUSTOMIZATION.md](CUSTOMIZATION.md) - 포트 및 환경 설정
2. [ARCHITECTURE.md](ARCHITECTURE.md) 정독
3. 코드 구조 학습 (icuapp.jsx, app.py)
4. [API_REFERENCE.md](API_REFERENCE.md)로 API 이해

### 고급 (5시간+)

1. [CUSTOMIZATION.md](CUSTOMIZATION.md) - 개발 환경 & 배포 환경
2. [ARCHITECTURE.md - 개발 가이드](ARCHITECTURE.md#개발-가이드) 학습
3. 새 API 엔드포인트 추가
4. 프론트엔드 새 페이지 추가
5. Docker & Nginx 배포

---

## 📝 최종 체크

모든 문서가 준비되었습니다!

- ✅ [README.md](README.md) - 프로젝트 개요
- ✅ [SETUP.md](SETUP.md) - 설치 & 실행
- ✅ [CUSTOMIZATION.md](CUSTOMIZATION.md) - 개인 환경 커스터마이징 ⭐ **NEW**
- ✅ [ARCHITECTURE.md](ARCHITECTURE.md) - 기술 상세
- ✅ [API_REFERENCE.md](API_REFERENCE.md) - API 명세
- ✅ [DOCS_INDEX.md](DOCS_INDEX.md) - 문서 인덱스 (현재 파일)

**이제 시작할 준비가 되셨습니다!**

👉 **추천 순서**:
1. [README.md](README.md) - 5분 (프로젝트 이해)
2. [CUSTOMIZATION.md](CUSTOMIZATION.md) - 20분 (경로 & 환경 설정) ⭐
3. [SETUP.md](SETUP.md) - 15분 (설치 & 실행)
4. 브라우저에서 확인

---

최종 업데이트: 2026-06-11
