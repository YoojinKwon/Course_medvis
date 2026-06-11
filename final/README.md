# MedViz ICU Monitor

실제 의료 데이터(MIMIC-IV waveform)와 연동된 ICU 환자 모니터링 시스템

## 폴더 구조

```
MedViz_claude/
├── backend/                    # FastAPI 백엔드
│   ├── app.py                 # REST API 서버
│   └── requirements.txt        # Python 의존성
│
├── frontend/                  # React 기반 프론트엔드
│   ├── MedViz ICU.html        # 메인 HTML 진입점
│   ├── icuapp.jsx             # 메인 React 앱
│   ├── icudata.js             # 실시간 데이터 로더
│   ├── icoms.jsx              # 공유 컴포넌트 (Icon, RiskBadge, TrendWave)
│   ├── ward.jsx               # 병실 그리드 페이지
│   ├── detail.jsx             # 환자 상세 페이지
│   └── icu.css                # 스타일시트
│
└── database/                  # 데이터 저장소
    └── waveform30.db          # SQLite 의료 데이터 (MIMIC-IV)
```

## 시작하기

### 1. 백엔드 시작 (conda activate medvis 환경)

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

API 엔드포인트:
- `GET /patients` - 환자 목록
- `GET /patients/{sid}/records` - 환자별 파형 레코드
- `GET /records/{rid}/numerics` - 생체신호 시계열 데이터
- `GET /patients/{sid}/notes` - 퇴원노트
- `GET /patients/{sid}/prescriptions` - 처방약

### 2. 프론트엔드 시작 (별도 터미널)

```bash
# HTTP 정적 서버 시작 (포트 3000)
cd frontend
python -m http.server 3000
```

**브라우저에서 열기:**
```
http://localhost:3000/MedViz%20ICU.html
```

## 주요 기능

- **6명 환자 모니터링**: MIMIC-IV 데이터베이스의 신뢰도 높은 환자 데이터
- **실시간 생체신호**: HR, SpO₂, RR, 혈압 등 9개 채널
- **위험도 시뮬레이션**: 2분 주기 로지스틱 회귀 모델
- **환자 상세 분석**: SHAP 설명 가능성, 유사 환자 검색
- **다국어**: 한국어 UI

## 데이터 구조

### 환자 정보 (icudata.js)
```javascript
{
  id: 'p14629329',           // 환자 ID
  name: '환자 14629329',      // 익명 이름
  sex: '남'/'여',            // 성별
  age: 'N/비공개',            // 나이
  room: '층 호실',           // 병실
  hr: 90,                    // 현재 심박수
  spo2: 96,                  // 현재 산소포화도
  prob: 0.52,                // 위험도 확률
  risk: 'LOW'/'MEDIUM'/'HIGH', // 위험 등급
  waveformSeries: {          // 실측 시계열 데이터
    hr: [85, 88, 90, ...],
    spo2: [96, 96, 95, ...]
  }
}
```

## 기술 스택

- **백엔드**: Python 3.10, FastAPI, SQLite
- **프론트엔드**: React 18.3.1, Babel (in-browser transpilation)
- **데이터**: MIMIC-IV Waveform Database (30명, 각 ~2백만 데이터 포인트)
- **스타일**: CSS Grid/Flexbox, 반응형 디자인

## 성능 최적화

- 다운샘플링: 원본 200만 행 → ~1000 포인트 (80% 데이터 크기 감소)
- 지연 로딩: 초기 로드 시간 ~40초 (병렬 API 요청)
- 캔버스 기반 렌더링: 대규모 시각화 최적화

## 문제 해결

### 포트 8000이 이미 사용 중인 경우
```bash
lsof -ti:8000 | xargs kill -9
```

### 데이터 로드 타임아웃
브라우저 콘솔 확인:
```
[ICU] Loading patient...
[ICU] Got XXXX numerics points
[ICU] Successfully loaded 6 patients
```

## 라이선스

MIMIC-IV 데이터는 PhysioNet 라이선스 하에 제공됩니다.
