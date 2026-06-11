# MedViz ICU Monitor - 기술 아키텍처

실제 의료 데이터(MIMIC-IV waveform)와 연동된 **ICU 환자 모니터링 시스템**의 완벽한 기술 문서입니다.

---

## 📋 목차
1. [전체 아키텍처](#전체-아키텍처)
2. [폴더 구조](#폴더-구조)
3. [백엔드 상세](#백엔드-상세)
4. [프론트엔드 상세](#프론트엔드-상세)
5. [API 명세](#api-명세)
6. [실행 방법](#실행-방법)
7. [개발 가이드](#개발-가이드)

---

## 전체 아키텍처

```
사용자 브라우저
     ↓
Frontend (React, 포트 3000)
     ↓
API 요청 (HTTP)
     ↓
ML Service Backend (Flask, 포트 5003)
     ↓
데이터 소스
├── prepared_v5/ (ML 모델, 특징 벡터)
├── database/waveform30.db (의료 데이터)
└── MIMIC-IV (원본 의료 데이터)
```

### 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| **Frontend** | React 18.3, Babel (in-browser) | UI/UX, 실시간 모니터링 |
| **Backend** | Flask + Flask-CORS | API 서버, ML 모델 서빙 |
| **ML** | scikit-learn, FAISS, SHAP | 위험도 예측, 유사 환자 검색, 설명 가능성 |
| **DB** | SQLite (waveform30.db) | 의료 데이터 저장 |
| **Data** | NumPy, Pandas | 시계열 데이터 처리 |

---

## 폴더 구조

```
MedViz_claude/ (root)
│
├── frontend/                           # React 프론트엔드
│   ├── MedViz ICU.html                # 메인 HTML 진입점
│   ├── index.html                     # 검색 페이지 (백업)
│   ├── icuapp.jsx                     # 메인 React 앱 (라우팅, 상태 관리)
│   ├── icudata.js                     # 데이터 로더 (API 호출, 초기 데이터)
│   ├── icoms.jsx                      # 공유 컴포넌트 (Icon, RiskBadge, TrendWave)
│   ├── ward.jsx                       # 페이지 1: 병실 그리드 (6명 환자 목록)
│   ├── detail.jsx                     # 페이지 2: 환자 상세 (9채널, SHAP)
│   └── icu.css                        # 스타일시트 (CSS Grid/Flexbox)
│
├── backend/
│   ├── ml_service/                    # ⭐ ML 백엔드 (Flask)
│   │   ├── app.py                     # Flask 앱 (라우트 등록, 모델 초기화)
│   │   ├── config.py                  # 설정 (포트, 경로, 임계값)
│   │   ├── core/
│   │   │   └── model_loader.py        # ModelStore 싱글톤 (모델/데이터 로드)
│   │   └── routes/                    # API 엔드포인트
│   │       ├── risk.py                # GET /api/ml/risk/{sid} - 위험도 예측
│   │       ├── numerics.py            # GET /api/ml/numerics/{sid} - 시계열 데이터
│   │       ├── shap.py                # GET /api/ml/shap/{sid} - 설명 가능성
│   │       └── similar.py             # GET /api/ml/similar/{sid} - 유사 환자 검색
│   │
│   ├── prepared_v5/                   # ⭐ ML 모델 및 특징 벡터 (2.6GB)
│   │   ├── channels.json              # 신호 채널 정의 (HR, SpO2, ...)
│   │   ├── metadata_v2.csv            # 환자 메타데이터 (185명, 137961 윈도우)
│   │   ├── linear_classifier.pkl      # LR 모델 + StandardScaler
│   │   ├── linear_faiss.bin           # FAISS 인덱스 (PCA 64차원)
│   │   ├── windows.npy                # 신호 데이터 (2.4GB, 다운샘플됨)
│   │   ├── shap_3d.npy                # SHAP 값 (152MB, 특성 중요도)
│   │   └── allowed_subjects.json      # 허용된 환자 목록 (PhysioNet 규정)
│   │
│   ├── api/                           # FastAPI 백엔드 (미사용)
│   │   └── index.py                   # 간단한 환자 CRUD API
│   │
│   └── flask-app/                     # Flask Monolith (개발용, 미사용)
│       └── app.py
│
├── database/
│   └── waveform30.db                  # SQLite (퇴원 노트, 처방약, 진료 기록)
│
├── (root level JSX files - 레거시)
│   ├── app.jsx
│   ├── components.jsx
│   ├── rag.jsx
│   ├── ragpage.jsx
│   ├── tweaks-panel.jsx
│   ├── styles.css
│   └── data.js
│
└── MedViz_claude.code-workspace       # VS Code workspace 설정
```

---

## 백엔드 상세

### ML Service 아키텍처

```python
# 초기화 흐름
Flask 앱 시작
  ↓
ModelStore.get() 싱글톤 생성
  ↓
prepared_v5/ 파일 로드
  ├── metadata_v2.csv → 환자 메타데이터, 윈도우 인덱싱
  ├── linear_classifier.pkl → LR 모델 + StandardScaler
  ├── windows.npy → 모든 신호 데이터 (2.4GB)
  ├── linear_faiss.bin → FAISS 인덱스
  ├── shap_3d.npy → SHAP 특성 중요도
  └── allowed_subjects.json → 허용 환자 목록
  ↓
위험도 확률 계산 (LR 모델)
  ↓
API 라우트 등록
```

### 주요 클래스: ModelStore

```python
class ModelStore:
    _instance = None  # 싱글톤
    
    # 주요 속성
    self.meta                 # DataFrame: 환자별 메타데이터
    self.subject_map          # Dict: subject_id → window indices
    self.all_probs            # Array: 모든 윈도우의 위험도 확률
    self.all_windows          # Array: 신호 데이터 (다운샘플됨)
    self.shap_3d              # Array: SHAP 값
    self.faiss_index          # FAISS: 유사 신호 검색
    self.notes_db             # SQLite 연결: 퇴원 노트
    
    # 주요 메서드
    def prob_to_level(prob)   # 확률 → 위험 등급 (HIGH/MEDIUM/LOW)
```

### API 엔드포인트

#### 1. **위험도 예측** - `GET /api/ml/risk/{sid}`
```json
Request:
  sid: "p14629329" (string, 환자 ID)

Response 200:
{
  "subject_id": "p14629329",
  "risk_prob": 0.52,          // 위험도 확률 (0~1)
  "risk_level": "MEDIUM",     // "HIGH" | "MEDIUM" | "LOW"
  "n_windows": 234            // 이 환자의 윈도우 개수
}
```

#### 2. **시계열 데이터** - `GET /api/ml/numerics/{sid}`
```json
Request:
  sid: "p14629329"

Response 200:
{
  "subject_id": "p14629329",
  "channels": ["HR [bpm]", "SpO2 [%]", "Pulse (SpO2)", ...],
  "data": [                   // 각 채널별 시계열
    [88.2, 89.1, 87.5, ...], // HR 채널 (512 포인트)
    [96.0, 96.2, 95.8, ...], // SpO2 채널
    ...
  ],
  "timestamps": [0, 1, 2, ...]
}
```

#### 3. **설명 가능성** - `GET /api/ml/shap/{sid}`
```json
Request:
  sid: "p14629329"

Response 200:
{
  "subject_id": "p14629329",
  "bands": [
    {"start": 0.04, "end": 0.12},  // SHAP 특성 중요도 구간
    {"start": 0.17, "end": 0.24},
    ...
  ]
}
```

#### 4. **유사 환자 검색** - `GET /api/ml/similar/{sid}?top_k=5`
```json
Request:
  sid: "p14629329"
  top_k: 5 (int, 상위 N명)

Response 200:
{
  "query_subject_id": "p14629329",
  "similar_patients": [
    {
      "patient_id": "p15857793",
      "distance": 0.234,        // FAISS 거리 (작을수록 유사)
      "risk_prob": 0.48,
      "risk_level": "MEDIUM",
      "waveformSeries": {...}   // 시계열 데이터
    },
    ...
  ]
}
```

#### 5. **헬스체크** - `GET /api/ml/health`
```json
Response 200:
{
  "status": "ok",
  "service": "ml_service",
  "port": 5003,
  "n_windows": 137961,
  "n_patients": 185,
  "shap_available": true
}
```

---

## 프론트엔드 상세

### 상태 관리 (React)

```javascript
// 전역 상태
window.ICU = {
  patients,           // 6명 환자 배열
  channels,           // 신호 채널 정의
  riskOf(prob),       // 확률 → 위험 등급
  clamp(v, a, b)      // 범위 제한
}

// 컴포넌트별 로컬 상태 (icuapp.jsx)
const [patients, setPatients]           // 현재 6명 환자
const [view, setView]                   // 현재 페이지 (ward | detail)
const [notifs, setNotifs]               // 알림 목록
const [shapOn, setShapOn]               // SHAP 시각화 토글
const [signalView, setSignalView]       // 신호 필터 (both | vitals | waves)
```

### 페이지 구조

#### 페이지 1: Ward (병실 그리드)
- **목적**: 6명 환자 한눈에 모니터링
- **레이아웃**: CSS Grid (3×2)
- **각 카드 정보**:
  - 환자명, 성별, 나이, 병실
  - HR, SpO2, RR, BP (현재값)
  - 위험도 등급 (색상 코딩)
  - 위험도 확률 게이지
- **상호작용**: 카드 클릭 → 상세 페이지로 이동

#### 페이지 2: Detail (환자 상세)
- **목적**: 1명 환자의 상세 분석
- **레이아웃**: 
  - 상단: 환자 정보 + 임상 노트
  - 중단: 9개 채널 신호 그래프 + SHAP 밴드
  - 하단: 유사 환자 목록 (확장 가능)
- **신호 채널**:
  - 생체신호 (HR, SpO2): 원시 데이터
  - 파형 (RR, BP, QT, QTc): 스무딩된 시각화
- **SHAP**: 신호 구간별 특성 중요도 (위험도에 미치는 영향)

### 컴포넌트 계층

```
ICUApp (icuapp.jsx) - 라우터 + 상태 관리
├── Ward (ward.jsx)
│   └── PatientCard × 6
│       ├── RiskBadge (icoms.jsx)
│       ├── TrendWave (icoms.jsx)
│       └── Icon (icoms.jsx)
│
└── Detail (detail.jsx)
    ├── PatientHeader
    ├── ClinicalNote
    ├── ChannelRow × 9
    │   ├── TrendWave (icoms.jsx) - 신호 시각화
    │   └── SHAP bands - 특성 중요도
    │
    └── ArchiveExpand × 5 (유사 환자)
        └── ChannelRow × 3 (HR, SpO2, Pulse)
```

### 신호 시각화 (TrendWave 컴포넌트)

```javascript
<TrendWave
  kind="hr"                  // 신호 종류 (hr | spo2 | wave)
  color="#f472b6"           // 색상
  series={[0.1, -0.2, ...]} // 정규화된 시계열 (-1~1)
  amp={0.36}                // 진폭 (canvas 높이)
  baseline={0.5}            // 중심 위치
  lineWidth={1.4}           // 선 굵기
  speed={60}                // 애니메이션 속도 (px/sec)
/>

// 내부: Canvas 기반 렌더링
// → 1000+ 포인트도 부드럽게 표시
```

### 데이터 흐름

```javascript
1. 앱 로드
   ↓
2. icudata.js: loadICUData()
   └─ 6명 환자 병렬 API 호출
      ├── /api/ml/risk/{sid} → 위험도
      ├── /api/ml/numerics/{sid} → 시계열
      ├── /api/ml/shap/{sid} → SHAP
      └── /api/ml/similar/{sid} → 유사 환자
   ↓
3. window.ICU 전역 설정
   ↓
4. icuapp.jsx: initPatients() → 초기 렌더링
   ↓
5. 2분 주기 업데이트
   ├── updateVitals() - 2초마다 생체신호 변동 시뮬레이션
   └── runModel() - 40초마다 위험도 재계산 (백엔드 또는 프론트엔드 시뮬레이션)
```

---

## 실행 방법

### 1️⃣ 설치

```bash
cd MedViz_claude

# Python 의존성
pip install flask flask-cors numpy pandas scikit-learn faiss-cpu

# (선택) 추가 최적화 라이브러리
pip install bottleneck  # 속도 향상
```

### 2️⃣ 3개 터미널에서 서비스 실행

**터미널 1: ML Service (Flask, 포트 5003)**
```bash
cd backend/ml_service
python app.py
```
- 모델 로드: ~10초 (prepared_v5/ 읽기)
- "Running on http://localhost:5003" 출력 → 준비 완료

**터미널 2: 프론트엔드 HTTP 서버 (포트 3000)**
```bash
cd frontend
python -m http.server 3000
```
- "Serving HTTP on 0.0.0.0 port 3000" 출력 → 준비 완료

**터미널 3: 브라우저 열기**
```bash
# 또는 수동으로 브라우저에서:
http://localhost:3000/MedViz%20ICU.html
```

### 3️⃣ 성능 확인

```bash
# 헬스체크
curl http://localhost:5003/api/ml/health

# 환자 목록
curl http://localhost:5003/api/ml/patients
```

---

## 개발 가이드

### 포트 변경 (예: 5003 → 5004)

**backend/ml_service/config.py**
```python
ML_PORT = 5004  # 변경
```

**frontend/icudata.js**
```javascript
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:5004'  // 변경
  : window.location.origin;
```

### 새 API 엔드포인트 추가

**backend/ml_service/routes/custom.py**
```python
from flask import Blueprint, jsonify

bp = Blueprint('custom', __name__)

@bp.route('/api/ml/custom/<sid>')
def custom_endpoint(sid):
    store = ModelStore.get()
    # 구현...
    return jsonify({'result': ...})
```

**backend/ml_service/app.py**
```python
from routes.custom import bp as custom_bp
app.register_blueprint(custom_bp)
```

### 프론트엔드 라우팅 추가

**frontend/icuapp.jsx**
```javascript
if (view.page === 'ward') {
  return <Ward patients={patients} onSelect={...} />;
} else if (view.page === 'detail') {
  return <Detail patient={...} />;
} else if (view.page === 'custom') {  // 새 페이지
  return <Custom />;
}
```

### 디버깅

```bash
# 백엔드 로그
# → 터미널 1에서 실시간 확인

# 프론트엔드 콘솔
# → 브라우저 개발자도구 (F12) → Console
# → [ICU] 로그로 시작하는 메시지 확인

# API 응답 테스트
curl -s 'http://localhost:5003/api/ml/risk/p14629329' | jq
```

---

## 데이터 구조

### 환자 객체 (Patient)

```javascript
{
  id: 'p14629329',              // 환자 ID
  name: '페이커',                // 익명 이름
  sex: '남',                     // 성별 (남/여)
  age: 42,                       // 나이
  room: '5층 502호',             // 병실
  
  // 현재 생체신호
  hr: 90,                        // 심박수 (bpm)
  spo2: 96,                      // 산소포화도 (%)
  rr: 18,                        // 호흡수 (회/분)
  bp: '120/80',                  // 혈압
  
  // 위험도
  prob: 0.52,                    // 확률 (0~1)
  risk: 'MEDIUM',                // 등급 (LOW/MEDIUM/HIGH)
  
  // 시계열 데이터 (정규화됨: -1~1)
  waveformSeries: {
    hr: [0.05, 0.12, -0.08, ...],
    spo2: [0.3, 0.28, 0.32, ...],
    pulse_spo2: [...],
    rr: [...],
    nbps: [...],  // 수축기 혈압
    nbpd: [...],  // 이완기 혈압
    nbpm: [...],  // 평균 혈압
    qt: [...],
    qtc: [...]
  },
  
  // 메타데이터
  drift: 0.02,                   // 위험도 추세 (-0.1~0.1)
  vol: 0.15,                     // 변동성 (0~0.2)
  
  // 유사 환자 & SHAP (detail 페이지)
  archive: [
    { patient_id: 'p15857793', risk_prob: 0.48, ... },
    ...
  ],
  shapBands: [
    { start: 0.04, end: 0.12 },
    ...
  ]
}
```

### 신호 채널 (Channel)

```javascript
{
  key: 'hr',                     // 데이터 키
  label: 'HR',                   // 표시 레이블
  color: '#f472b6',              // 차트 색상
  kind: 'hr',                    // 시각화 종류 (hr | spo2 | wave)
  shap: true                     // SHAP 밴드 표시 여부
}
```

---

## 성능 최적화

### 현재 최적화 방법

| 항목 | 최적화 | 효과 |
|------|--------|------|
| **데이터 크기** | 다운샘플링 (200만 → ~1000 포인트) | 80% 데이터 감소 |
| **API 병렬화** | Promise.all() 사용 | 초기 로드 ~40초 |
| **캔버스 렌더링** | TrendWave 컴포넌트 | 부드러운 실시간 표시 |
| **메모리** | ModelStore 싱글톤 | 중복 로드 방지 |
| **FAISS 인덱싱** | PCA 64차원 | 빠른 유사도 검색 |

### 추가 최적화 아이디어

- **가상 스크롤**: 많은 환자 데이터 처리
- **WebSocket**: 실시간 데이터 스트리밍
- **Service Worker**: 오프라인 모드
- **GraphQL**: 유연한 데이터 쿼리

---

## 라이선스 & 데이터 출처

- **MIMIC-IV**: PhysioNet, MIT-LCP
  - 대규모 다기관 ICU 데이터베이스
  - 40,000+ 환자, 수백만 시계열 시점
  - 교육 및 연구 목적만 허용

- **본 시스템**: 의료 교육 및 시각화 목적
  - 실제 임상 사용 불가
  - 환자 데이터는 완전 익명화됨

---

## FAQ

**Q: 포트 5003이 이미 사용 중이면?**
```bash
lsof -i :5003 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

**Q: 모델 로드 시간이 오래 걸리면?**
- Windows.npy (2.4GB) 읽기 중
- SSD 사용 권장
- 첫 로드는 느리지만, 이후 메모리 상주

**Q: "Address already in use" 에러?**
```bash
# 기존 프로세스 종료
pkill -f "python app.py"
pkill -f "http.server"
```

**Q: API 응답이 늦으면?**
- 첫 요청: 모델 계산 (~1초)
- 이후: 캐시된 데이터 반환 (<100ms)

---

## 연락처 & 지원

데이터 요청, 기술 질문: MIMIC-IV [PhysioNet](https://physionet.org/)

최종 업데이트: 2026-06-11
