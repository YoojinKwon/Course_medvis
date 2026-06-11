# MedViz - 설치 및 실행 가이드

**MedViz ICU Monitor** 시스템을 설치하고 실행하는 완전한 가이드입니다.

---

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [사전 준비](#사전-준비)
3. [설치 단계](#설치-단계)
4. [실행 방법](#실행-방법)
5. [포트 설정](#포트-설정)
6. [문제 해결](#문제-해결)
7. [성능 확인](#성능-확인)

---

## 시스템 요구사항

### 최소 사양

| 항목 | 요구사항 |
|------|---------|
| **OS** | macOS / Linux / Windows (WSL2) |
| **Python** | 3.8 이상 (3.10 권장) |
| **메모리** | 8GB 이상 (모델 로드용) |
| **디스크** | 4GB 여유 공간 |
| **네트워크** | localhost 포트 3000, 5003 사용 가능 |

### 설치된 Python 확인

```bash
python --version
# Python 3.10.x 이상이어야 함
```

### 포트 확인 (macOS/Linux)

```bash
# 포트 3000, 5003 사용 가능 여부 확인
lsof -i :3000 || echo "포트 3000 사용 가능"
lsof -i :5003 || echo "포트 5003 사용 가능"
```

---

## 사전 준비

### 1. 저장소 클론 또는 다운로드

```bash
# 이미 있다면 스킵
cd MedViz_claude
pwd  # /Users/kyj/Documents/2026-1/MedViz/2026-1 MedViz/MedViz_claude 확인
```

### 2. 필수 데이터 파일 확인

```bash
# 프로젝트 루트에서
ls -lh backend/prepared_v5/      # 2.6GB 모델 파일
ls -lh database/waveform30.db    # 1.9GB 의료 데이터
```

**필수 파일:**
- ✅ `backend/prepared_v5/channels.json`
- ✅ `backend/prepared_v5/metadata_v2.csv`
- ✅ `backend/prepared_v5/linear_classifier.pkl`
- ✅ `backend/prepared_v5/linear_faiss.bin`
- ✅ `backend/prepared_v5/windows.npy` (2.4GB)
- ✅ `backend/prepared_v5/shap_3d.npy` (152MB)
- ✅ `backend/prepared_v5/allowed_subjects.json`
- ✅ `database/waveform30.db` (1.9GB)

파일 없으면 PhysioNet에서 다운로드: [physionet.org/content/mimic-iv-waveform](https://physionet.org/content/mimic-iv-waveform/)

---

## 설치 단계

### 1단계: Python 의존성 설치

프로젝트 루트에서:

```bash
pip install --upgrade pip
```

#### 필수 패키지

```bash
pip install \
    flask \
    flask-cors \
    numpy \
    pandas \
    scikit-learn \
    faiss-cpu
```

또는 한 줄로:

```bash
pip install flask flask-cors numpy pandas scikit-learn faiss-cpu
```

#### (선택) 성능 최적화 패키지

```bash
pip install bottleneck  # 데이터 처리 속도 향상
```

### 2단계: 설치 확인

```bash
python -c "
import flask
import numpy
import pandas
import sklearn
import faiss
print('✓ 모든 패키지 설치됨')
"
```

### 3단계: 설정 파일 확인

`backend/ml_service/config.py`에서:

```python
ML_PORT = 5003  # 포트 (필요시 변경)
```

---

## 실행 방법

### 🚀 빠른 시작 (권장)

**터미널 1: ML Service 시작**

```bash
cd backend/ml_service
python app.py
```

예상 로그:
```
[ML Service] Loading models...
  Loading linear_classifier.pkl...
  Loading windows.npy...
  Computing risk probabilities...
  Loading linear_faiss.bin...
  ...
[ML Service] Running on http://localhost:5003
 * Running on http://0.0.0.0:5003
```

⏱️ **로드 시간**: 첫 시작 시 ~15-30초 (데이터 읽기)

**터미널 2: 프론트엔드 시작**

```bash
cd frontend
python -m http.server 3000
```

예상 로그:
```
Serving HTTP on 0.0.0.0 port 3000 (http://0.0.0.0:3000/)
```

**터미널 3: 브라우저 열기**

```bash
# macOS
open http://localhost:3000/MedViz%20ICU.html

# Linux
xdg-open http://localhost:3000/MedViz%20ICU.html

# Windows (WSL)
explorer.exe http://localhost:3000/MedViz%20ICU.html
```

또는 수동으로 브라우저에 입력:
```
http://localhost:3000/MedViz%20ICU.html
```

### 📊 자동 시작 스크립트 (macOS/Linux)

**`run.sh` 파일 생성:**

```bash
#!/bin/bash

# 터미널 1: ML Service
open -a Terminal backend/ml_service/app.py 2>/dev/null || \
  (osascript -e 'tell app "Terminal" to do script "cd '$PWD' && python backend/ml_service/app.py"' &)

# 잠시 대기
sleep 5

# 터미널 2: 프론트엔드
open -a Terminal frontend/python -m http.server 3000 2>/dev/null || \
  (osascript -e 'tell app "Terminal" to do script "cd '$PWD'/frontend && python -m http.server 3000"' &)

# 잠시 대기
sleep 3

# 터미널 3: 브라우저
open http://localhost:3000/MedViz%20ICU.html

echo "✓ MedViz 시작됨"
```

**실행:**

```bash
chmod +x run.sh
./run.sh
```

### 🔧 Docker를 사용한 실행 (선택)

**`Dockerfile` 생성:**

```dockerfile
FROM python:3.10-slim

WORKDIR /medviz

COPY backend/ml_service ./backend/ml_service
COPY backend/prepared_v5 ./backend/prepared_v5
COPY database ./database
COPY frontend ./frontend
COPY requirements.txt .

RUN pip install -q -r requirements.txt

EXPOSE 5003 3000

CMD ["sh", "-c", "python backend/ml_service/app.py & python -m http.server 3000"]
```

**`requirements.txt` 생성:**

```
flask
flask-cors
numpy
pandas
scikit-learn
faiss-cpu
bottleneck
```

**실행:**

```bash
docker build -t medviz .
docker run -p 3000:3000 -p 5003:5003 medviz
```

---

## 포트 설정

### 포트 변경하기

#### 1. ML Service 포트 변경 (예: 5003 → 8080)

**`backend/ml_service/config.py`**:
```python
ML_PORT = 8080  # 변경
```

**`frontend/icudata.js`**:
```javascript
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:8080'  // 변경
  : window.location.origin;
```

#### 2. 프론트엔드 포트 변경 (예: 3000 → 8000)

```bash
cd frontend
python -m http.server 8000  # 포트 변경

# 브라우저에서
http://localhost:8000/MedViz%20ICU.html
```

### 포트 충돌 해결

포트가 이미 사용 중인 경우:

#### macOS/Linux

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :5003

# 프로세스 강제 종료
lsof -ti:5003 | xargs kill -9

# 또는 모든 Python 프로세스 종료
pkill -f "python"
```

#### Windows

```bash
# PowerShell에서
netstat -ano | findstr :5003

# 프로세스 강제 종료
taskkill /PID <PID> /F
```

---

## 문제 해결

### ❌ "Address already in use" 오류

```bash
# 기존 프로세스 강제 종료
lsof -ti:5003 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# 다시 시작
python backend/ml_service/app.py
```

### ❌ "ModuleNotFoundError: No module named 'flask'"

```bash
# 의존성 재설치
pip install --upgrade flask flask-cors numpy pandas scikit-learn faiss-cpu
```

### ❌ "File not found" (prepared_v5 또는 waveform30.db)

```bash
# 파일 확인
ls -lh backend/prepared_v5/
ls -lh database/

# 파일 크기 확인 (0이 아니어야 함)
du -h backend/prepared_v5/*
du -h database/waveform30.db
```

**해결**: 파일 다운로드 필요
- PhysioNet: [physionet.org/content/mimic-iv-waveform](https://physionet.org/content/mimic-iv-waveform/)
- 또는 관리자에게 문의

### ❌ "Connection refused" (포트 5003)

```bash
# ML Service가 실행 중인지 확인
curl http://localhost:5003/api/ml/health

# 실행 중이 아니면 터미널 1에서 시작
python backend/ml_service/app.py
```

### ❌ 로드 시간이 오래 걸림 (> 30초)

**원인**: windows.npy 읽기 (2.4GB)

**해결책**:
1. SSD 사용 여부 확인
2. 메모리 여유 확인 (`free -h` 또는 `top`)
3. 다른 프로세스 종료

```bash
# 시스템 리소스 확인
top  # Ctrl+C로 종료
```

### ❌ 브라우저에서 "데이터 로드 안됨"

**확인 사항**:

```bash
# 1. ML Service 헬스체크
curl http://localhost:5003/api/ml/health

# 2. 환자 목록 조회
curl http://localhost:5003/api/ml/patients | head -20

# 3. 브라우저 콘솔 확인 (F12)
# → [ICU] 로그 확인
# → 네트워크 탭에서 API 응답 확인
```

---

## 성능 확인

### 헬스체크

```bash
curl http://localhost:5003/api/ml/health | jq
```

**예상 응답**:
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

### API 응답 시간 측정

```bash
# Python 사용
python -c "
import time
import requests

start = time.time()
resp = requests.get('http://localhost:5003/api/ml/patients')
elapsed = time.time() - start
print(f'응답 시간: {elapsed:.3f}초')
print(f'환자 수: {len(resp.json()[\"patients\"])}')
"
```

### 로드 테스트

```bash
# 병렬 요청 10개 (Apache Bench)
ab -n 10 -c 5 http://localhost:5003/api/ml/patients

# 또는 curl + xargs
seq 1 10 | xargs -P 5 -I {} curl -s http://localhost:5003/api/ml/health | grep status | wc -l
```

---

## 다음 단계

- ✅ [ARCHITECTURE.md](ARCHITECTURE.md) - 시스템 구조 이해
- ✅ [API_REFERENCE.md](API_REFERENCE.md) - API 상세 명세
- ✅ 브라우저에서 http://localhost:3000/MedViz%20ICU.html 접속

---

## 지원

**문제 발생 시**:

1. **콘솔 로그 확인** (터미널에서 [ERROR] 메시지)
2. **브라우저 콘솔 확인** (F12 → Console)
3. **네트워크 탭 확인** (F12 → Network)
4. [문제 해결](#문제-해결) 섹션 참고

---

최종 업데이트: 2026-06-11
