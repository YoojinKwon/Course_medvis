# MedViz ML Service - API 레퍼런스

ML Service 백엔드 (Flask, 포트 5003)의 완전한 API 명세서입니다.

---

## 📌 기본 정보

- **Base URL**: `http://localhost:5003`
- **포트**: `5003`
- **프로토콜**: HTTP/REST
- **응답 형식**: JSON
- **CORS**: ✅ 활성화됨

---

## 🔗 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/ml/health` | 서비스 상태 확인 |
| `GET` | `/api/ml/patients` | 모든 환자 목록 |
| `GET` | `/api/ml/risk/{sid}` | 환자 위험도 예측 |
| `GET` | `/api/ml/numerics/{sid}` | 환자 시계열 데이터 |
| `GET` | `/api/ml/shap/{sid}` | 환자 SHAP 설명 가능성 |
| `GET` | `/api/ml/similar/{sid}` | 유사 환자 검색 |

---

## 1️⃣ 헬스체크

### `GET /api/ml/health`

**목적**: 서비스 상태 및 데이터 통계 확인

**요청**:
```bash
curl http://localhost:5003/api/ml/health
```

**응답** (200 OK):
```json
{
  "status": "ok",
  "service": "ml_service",
  "port": 5003,
  "n_windows": 137961,
  "n_patients": 185,
  "shap_available": true
}
```

**응답 필드**:
- `status` (string): "ok" = 정상
- `service` (string): 서비스 이름
- `port` (int): 실행 중인 포트
- `n_windows` (int): 전체 시계열 윈도우 개수
- `n_patients` (int): 전체 환자 수
- `shap_available` (bool): SHAP 데이터 사용 가능 여부

---

## 2️⃣ 환자 목록

### `GET /api/ml/patients`

**목적**: 모든 환자의 위험도 개요

**요청**:
```bash
curl http://localhost:5003/api/ml/patients
```

**응답** (200 OK):
```json
{
  "patients": [
    {
      "subject_id": "p14629329",
      "n_windows": 234,
      "risk_prob": 0.52,
      "risk_level": "MEDIUM"
    },
    {
      "subject_id": "p15857793",
      "n_windows": 198,
      "risk_prob": 0.48,
      "risk_level": "MEDIUM"
    },
    ...
  ]
}
```

**응답 필드**:
- `patients` (array):
  - `subject_id` (string): 환자 ID (예: "p14629329")
  - `n_windows` (int): 이 환자의 시계열 윈도우 개수
  - `risk_prob` (float): 위험도 확률 (0.0 ~ 1.0)
  - `risk_level` (string): "HIGH" | "MEDIUM" | "LOW"

**정렬**: 위험도 확률 내림차순 (위험한 환자 먼저)

---

## 3️⃣ 환자 위험도

### `GET /api/ml/risk/{sid}`

**목적**: 특정 환자의 위험도 예측

**경로 파라미터**:
- `sid` (string): 환자 ID (형식: `p14629329`)
  - 예: `p14629329`, `p15857793`, `p17973277`

**요청**:
```bash
curl "http://localhost:5003/api/ml/risk/p14629329"
```

**응답** (200 OK):
```json
{
  "subject_id": "p14629329",
  "risk_prob": 0.5234,
  "risk_level": "MEDIUM",
  "n_windows": 234,
  "best_window_idx": 45
}
```

**응답 필드**:
- `subject_id` (string): 요청한 환자 ID
- `risk_prob` (float): 위험도 확률
  - 0.0 ~ 0.35: LOW (낮음)
  - 0.35 ~ 0.60: MEDIUM (중간)
  - 0.60 ~ 1.0: HIGH (높음)
- `risk_level` (string): 위험 등급
- `n_windows` (int): 이 환자의 총 윈도우 개수
- `best_window_idx` (int): 위험도가 가장 높은 윈도우 인덱스

**에러**:
```json
// 404: 환자를 찾을 수 없음
{ "error": "Patient p99999999 not found" }

// 400: 잘못된 환자 ID 형식
{ "error": "Invalid patient ID format" }
```

---

## 4️⃣ 시계열 데이터

### `GET /api/ml/numerics/{sid}`

**목적**: 환자의 9개 신호 채널 시계열 데이터

**경로 파라미터**:
- `sid` (string): 환자 ID (예: `p14629329`)

**요청**:
```bash
curl "http://localhost:5003/api/ml/numerics/p14629329"
```

**응답** (200 OK):
```json
{
  "subject_id": "p14629329",
  "channels": [
    "HR [bpm]",
    "SpO2 [%]",
    "Pulse (SpO2)",
    "RR [breaths/min]",
    "NBPs [mmHg]",
    "NBPd [mmHg]",
    "NBPm [mmHg]",
    "QT [msec]",
    "QTc [msec]"
  ],
  "data": [
    [88.2, 89.1, 87.5, 88.9, 87.2, ...],  // HR: 512 포인트
    [96.0, 96.2, 95.8, 96.1, 96.3, ...],  // SpO2: 512 포인트
    [1.2, 1.5, 1.1, 1.3, 1.4, ...],       // Pulse: 512 포인트
    ...  // 총 9개 채널
  ],
  "timestamps": [0, 1, 2, 3, ..., 511],
  "normalization": {
    "hr": {"min": 40, "max": 160},
    "spo2": {"min": 80, "max": 100},
    ...
  }
}
```

**응답 필드**:
- `subject_id` (string): 환자 ID
- `channels` (array): 신호 채널 이름 (9개)
- `data` (array of array): 신호 데이터
  - 각 채널별 512개 시점의 값
  - **정규화됨**: -1.0 ~ 1.0 범위로 스케일링
- `timestamps` (array): 시간 인덱스 (상대적)
- `normalization` (object): 정규화 파라미터 (원본 범위)

**신호 채널**:

| # | 채널 | 단위 | 설명 | 데이터 타입 |
|---|------|------|------|-----------|
| 0 | HR | bpm | 심박수 | 생체신호 |
| 1 | SpO2 | % | 산소포화도 | 생체신호 |
| 2 | Pulse (SpO2) | - | 맥박 파형 | 파형 |
| 3 | RR | breaths/min | 호흡수 | 파형 |
| 4 | NBPs | mmHg | 수축기 혈압 | 파형 |
| 5 | NBPd | mmHg | 이완기 혈압 | 파형 |
| 6 | NBPm | mmHg | 평균 혈압 | 파형 |
| 7 | QT | msec | QT 간격 | 파형 |
| 8 | QTc | msec | QTc 간격 (보정됨) | 파형 |

**데이터 범위** (정규화 전):
```python
HR:          40 ~ 160 bpm
SpO2:        80 ~ 100 %
RR:          6 ~ 46 breaths/min
NBPs:        90 ~ 180 mmHg
NBPd:        50 ~ 120 mmHg
NBPm:        70 ~ 140 mmHg
QT:          200 ~ 500 msec
QTc:         350 ~ 500 msec
```

**에러**:
```json
// 404: 환자를 찾을 수 없음
{ "error": "Patient p99999999 not found" }

// 500: 데이터 로드 실패
{ "error": "Failed to load numerics" }
```

---

## 5️⃣ SHAP 설명 가능성

### `GET /api/ml/shap/{sid}`

**목적**: 환자의 위험도에 영향을 미치는 신호 구간 (SHAP 값)

**경로 파라미터**:
- `sid` (string): 환자 ID

**요청**:
```bash
curl "http://localhost:5003/api/ml/shap/p14629329"
```

**응답** (200 OK):
```json
{
  "subject_id": "p14629329",
  "bands": [
    {
      "start": 0.04,
      "end": 0.12,
      "importance": 0.85,
      "direction": "positive"
    },
    {
      "start": 0.17,
      "end": 0.24,
      "importance": 0.72,
      "direction": "negative"
    },
    {
      "start": 0.30,
      "end": 0.38,
      "importance": 0.68,
      "direction": "positive"
    },
    ...
  ],
  "n_bands": 7,
  "explanation": {
    "high_risk_regions": ["0.04-0.12", "0.44-0.52"],
    "low_risk_regions": ["0.17-0.24"]
  }
}
```

**응답 필드**:
- `subject_id` (string): 환자 ID
- `bands` (array): SHAP 밴드 (특성 중요도 구간)
  - `start` (float): 시작 위치 (0~1 상대값)
  - `end` (float): 종료 위치 (0~1 상대값)
  - `importance` (float): 중요도 (0~1)
  - `direction` (string): "positive" | "negative"
    - positive: 위험도 증가에 기여
    - negative: 위험도 감소에 기여
- `n_bands` (int): 중요 밴드 개수
- `explanation` (object): 자동 설명
  - `high_risk_regions` (array): 위험 구간
  - `low_risk_regions` (array): 안전 구간

**해석 예**:
```
SHAP 밴드가 신호의 4% ~ 12% 구간에 0.85 importance를 가짐
→ 이 구간의 신호 특성이 위험도 예측에 가장 중요함
→ 임상의가 이 구간에 집중하면 위험도 변화 추적 가능
```

---

## 6️⃣ 유사 환자 검색

### `GET /api/ml/similar/{sid}`

**목적**: 신호 특성이 유사한 다른 환자 찾기 (FAISS)

**경로 파라미터**:
- `sid` (string): 기준 환자 ID

**쿼리 파라미터**:
- `top_k` (int, 선택): 반환할 유사 환자 수 (기본값: 5)
  - 범위: 1 ~ 50

**요청**:
```bash
curl "http://localhost:5003/api/ml/similar/p14629329?top_k=5"
```

**응답** (200 OK):
```json
{
  "query_subject_id": "p14629329",
  "top_k": 5,
  "similar_patients": [
    {
      "patient_id": "p15857793",
      "distance": 0.234,
      "risk_prob": 0.48,
      "risk_level": "MEDIUM",
      "waveformSeries": {
        "hr": [0.05, 0.12, -0.08, ...],
        "spo2": [0.3, 0.28, 0.32, ...],
        "pulse_spo2": [...],
        "rr": [...],
        "nbps": [...],
        "nbpd": [...],
        "nbpm": [...],
        "qt": [...],
        "qtc": [...]
      },
      "parsedNote": {
        "admission": "2023-01-15",
        "discharge": "2023-01-28",
        "service": "MEDICINE",
        "allergies": ["Penicillin"],
        "results": {
          "labs": [...],
          "imaging": [...]
        }
      }
    },
    {
      "patient_id": "p17973277",
      "distance": 0.267,
      "risk_prob": 0.55,
      "risk_level": "MEDIUM",
      ...
    },
    ...
  ],
  "search_metrics": {
    "query_embedding_dim": 64,
    "faiss_index_type": "PCA",
    "total_vectors": 137961
  }
}
```

**응답 필드**:
- `query_subject_id` (string): 검색 기준 환자 ID
- `top_k` (int): 반환된 환자 수
- `similar_patients` (array): 유사 환자 목록 (거리 오름차순)
  - `patient_id` (string): 유사 환자 ID
  - `distance` (float): FAISS 거리 (작을수록 유사)
    - 0.0 ~ 0.5: 매우 유사
    - 0.5 ~ 1.0: 유사
    - 1.0+: 다소 다름
  - `risk_prob` (float): 위험도 확률
  - `risk_level` (string): 위험 등급
  - `waveformSeries` (object): 신호 시계열 (-1~1 정규화)
  - `parsedNote` (object): 임상 노트 파싱
- `search_metrics` (object): 검색 파라미터

**거리 해석**:
```
distance < 0.3  → "이 두 환자는 신호 특성이 거의 같음"
distance < 0.5  → "유사한 환자"
distance < 1.0  → "어느 정도 유사"
distance > 1.0  → "다른 환자"
```

**에러**:
```json
// 404: 환자를 찾을 수 없음
{ "error": "Patient p99999999 not found" }

// 400: 잘못된 top_k
{ "error": "top_k must be between 1 and 50" }

// 500: FAISS 검색 실패
{ "error": "FAISS search failed" }
```

---

## 🔄 응답 코드

| 코드 | 의미 | 예시 |
|------|------|------|
| 200 | OK - 성공 | 모든 정상 요청 |
| 400 | Bad Request - 잘못된 파라미터 | `top_k=100` (범위 초과) |
| 404 | Not Found - 환자 없음 | 존재하지 않는 sid |
| 500 | Internal Server Error | 예기치 않은 오류 |

---

## 📝 사용 예제

### Python 클라이언트

```python
import requests

BASE_URL = "http://localhost:5003"

# 1. 헬스체크
resp = requests.get(f"{BASE_URL}/api/ml/health")
print(resp.json())

# 2. 환자 목록
resp = requests.get(f"{BASE_URL}/api/ml/patients")
patients = resp.json()["patients"]
for p in patients[:3]:
    print(f"{p['subject_id']}: {p['risk_level']} ({p['risk_prob']:.2f})")

# 3. 특정 환자 위험도
resp = requests.get(f"{BASE_URL}/api/ml/risk/p14629329")
data = resp.json()
print(f"Risk: {data['risk_level']} ({data['risk_prob']:.2f})")

# 4. 시계열 데이터
resp = requests.get(f"{BASE_URL}/api/ml/numerics/p14629329")
data = resp.json()
print(f"Channels: {data['channels']}")
print(f"Data shape: {len(data['data'])} × {len(data['data'][0])}")

# 5. SHAP
resp = requests.get(f"{BASE_URL}/api/ml/shap/p14629329")
data = resp.json()
for band in data["bands"]:
    print(f"Band {band['start']:.2f}-{band['end']:.2f}: importance={band['importance']:.2f}")

# 6. 유사 환자
resp = requests.get(f"{BASE_URL}/api/ml/similar/p14629329?top_k=3")
data = resp.json()
for sim in data["similar_patients"]:
    print(f"{sim['patient_id']}: distance={sim['distance']:.3f}")
```

### JavaScript/Fetch

```javascript
const BASE_URL = 'http://localhost:5003';

// 위험도 조회
async function getRisk(sid) {
  const resp = await fetch(`${BASE_URL}/api/ml/risk/${sid}`);
  return resp.json();
}

// 시계열 데이터
async function getNumerics(sid) {
  const resp = await fetch(`${BASE_URL}/api/ml/numerics/${sid}`);
  return resp.json();
}

// 유사 환자
async function getSimilar(sid, topK = 5) {
  const resp = await fetch(`${BASE_URL}/api/ml/similar/${sid}?top_k=${topK}`);
  return resp.json();
}

// 사용
(async () => {
  const risk = await getRisk('p14629329');
  console.log(risk);
})();
```

### cURL

```bash
# 환자 목록 (모두)
curl http://localhost:5003/api/ml/patients | jq '.patients[:2]'

# 특정 환자 위험도
curl http://localhost:5003/api/ml/risk/p14629329 | jq

# 시계열 데이터 (첫 3개 채널, 첫 10 포인트만)
curl http://localhost:5003/api/ml/numerics/p14629329 | jq '.channels, .data[:3] | map(.[:10])'

# 유사 환자 (상위 3명)
curl 'http://localhost:5003/api/ml/similar/p14629329?top_k=3' | jq '.similar_patients[] | {id: .patient_id, dist: .distance}'
```

---

## 🚀 성능 팁

- **첫 요청**: 모델 초기화 및 계산 (~1초)
- **이후 요청**: 캐시된 데이터 반환 (<100ms)
- **병렬 요청**: 최대 10개 동시 요청 권장
- **데이터 크기**: numerics 응답은 ~50KB (각 환자)
- **FAISS 검색**: top_k=100 기준 ~50ms

---

## ❓ 자주 묻는 질문

**Q: 환자 ID 형식은?**
- 형식: `p` + 8자리 숫자 (예: `p14629329`)
- PhysioNet MIMIC-IV 식별자

**Q: 데이터는 실시간인가?**
- 아니요, 과거 데이터 (2008~2019)
- 시뮬레이션 목적으로 사용

**Q: 커스텀 쿼리는?**
- GraphQL 미지원 (REST만 제공)
- 필요 시 새로운 엔드포인트 추가 가능

**Q: 인증은?**
- 미지원 (로컬 개발 환경 가정)
- 프로덕션 배포 시 JWT 추가 권장

---

최종 업데이트: 2026-06-11
