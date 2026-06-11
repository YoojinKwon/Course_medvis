# MedViz - 개인 환경 커스터마이징 가이드

MedViz 프로젝트를 **자신의 개인 경로와 환경에 맞게 설정**하는 완전한 가이드입니다.

---

## 📋 목차

1. [프로젝트 경로 변경](#프로젝트-경로-변경)
2. [포트 번호 커스터마이징](#포트-번호-커스터마이징)
3. [프로젝트 이름 변경](#프로젝트-이름-변경)
4. [데이터 경로 설정](#데이터-경로-설정)
5. [개발 환경 설정](#개발-환경-설정)
6. [배포 환경 설정](#배포-환경-설정)

---

## 프로젝트 경로 변경

### 현재 설정 (예시)

```
/Users/kyj/Documents/2026-1/MedViz/2026-1 MedViz/MedViz_claude/  ← 프로젝트 루트
```

### Step 1: 프로젝트 폴더 이동/복사

#### 옵션 A: 다른 위치로 이동

```bash
# 현재 위치
cd /Users/kyj/Documents/2026-1/MedViz/2026-1\ MedViz/MedViz_claude

# 원하는 위치로 이동 (예: ~/Projects/MedViz)
mv ~/Documents/2026-1/MedViz/2026-1\ MedViz/MedViz_claude ~/Projects/MedViz

# 이동 후 확인
cd ~/Projects/MedViz
pwd
```

#### 옵션 B: 새 위치에 복사

```bash
# 복사 (원본 유지)
cp -r ~/Documents/2026-1/MedViz/2026-1\ MedViz/MedViz_claude ~/Projects/MedViz

# 확인
cd ~/Projects/MedViz
pwd
```

#### 옵션 C: 심볼릭 링크 생성 (권장 - 공간 절약)

```bash
# 원본은 유지하고, 바로가기 생성
ln -s /Users/kyj/Documents/2026-1/MedViz/2026-1\ MedViz/MedViz_claude ~/Projects/MedViz

# 확인
ls -la ~/Projects/MedViz
```

### Step 2: 새 경로로 이동

```bash
# 예: ~/Projects/MedViz로 설정했다면
cd ~/Projects/MedViz

# 파일 확인
ls -la
# → frontend/, backend/, database/, *.md 파일 등이 보이면 성공
```

### Step 3: VS Code 열기 (선택)

```bash
# 새 경로에서 VS Code 열기
code .
```

---

## 포트 번호 커스터마이징

기본 설정:
- **프론트엔드**: 포트 3000
- **ML Service**: 포트 5003

### ML Service 포트 변경 (예: 5003 → 8000)

#### 1️⃣ 백엔드 설정 변경

**`backend/ml_service/config.py`**:

```python
# 변경 전
ML_PORT = 5003

# 변경 후
ML_PORT = 8000  # 또는 원하는 포트
```

#### 2️⃣ 프론트엔드 설정 변경

**`frontend/icudata.js`** (상단):

```javascript
// 변경 전
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:5003'
  : window.location.origin;

// 변경 후
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:8000'  // 포트 변경
  : window.location.origin;
```

#### 3️⃣ 실행 확인

```bash
# 터미널 1: ML Service
cd backend/ml_service
python app.py
# → "Running on http://localhost:8000" 확인

# 터미널 2: 프론트엔드
cd frontend
python -m http.server 3000

# 브라우저
http://localhost:3000/MedViz%20ICU.html
```

### 프론트엔드 포트 변경 (예: 3000 → 8080)

```bash
# 포트 8080으로 시작
cd frontend
python -m http.server 8080

# 브라우저에서
http://localhost:8080/MedViz%20ICU.html
```

**⚠️ 주의**: ML_BASE 설정도 확인하기

```javascript
// 프론트엔드 포트가 8080이면:
const ML_BASE = window.location.origin.includes(':8080')
  ? 'http://localhost:5003'  // ML Service 포트
  : window.location.origin;
```

---

## 프로젝트 이름 변경

### Step 1: 폴더 이름 변경

```bash
# 예: MedViz_claude → MyICUMonitor

# 현재 폴더 확인
pwd

# 부모 디렉토리로 이동
cd ..

# 폴더 이름 변경
mv MedViz_claude MyICUMonitor

# 새 폴더로 이동
cd MyICUMonitor
```

### Step 2: 파일명 변경 (선택)

프로젝트 이름을 바꾸면 다음 파일도 변경할 수 있습니다:

**`MedViz_claude.code-workspace` → `MyICUMonitor.code-workspace`**

```bash
mv MedViz_claude.code-workspace MyICUMonitor.code-workspace
```

**workspace 파일 내용 수정**:

```json
{
  "folders": [
    {
      "path": "."
    }
  ],
  "settings": {},
  "launch": {
    "version": "0.2.0",
    "configurations": []
  }
}
```

### Step 3: 문서 헤더 변경 (선택)

**`README.md` 상단**:

```markdown
# MyICUMonitor - ICU 환자 모니터링 시스템

# 폴더 구조

```
MyICUMonitor/
├── backend/
├── frontend/
├── database/
└── ...
```
```

---

## 데이터 경로 설정

### 기본 경로 구조

```
프로젝트 루트/
├── backend/
│   └── prepared_v5/        ← ML 모델 (2.6GB)
└── database/
    └── waveform30.db       ← 의료 데이터 (1.9GB)
```

### 외부 위치에서 데이터 사용

#### 상황: 데이터가 다른 위치에 있음

```
/data/medviz_models/prepared_v5/      ← 여기에 모델
/data/medviz_db/waveform30.db         ← 여기에 DB
```

#### 해결: 심볼릭 링크 생성

```bash
# 프로젝트 루트로 이동
cd ~/Projects/MedViz

# 심볼릭 링크 생성
ln -s /data/medviz_models/prepared_v5 backend/prepared_v5
ln -s /data/medviz_db/waveform30.db database/waveform30.db

# 확인
ls -la backend/prepared_v5
ls -la database/waveform30.db
# → 실제 파일을 가리키는 링크 확인
```

#### 해결 2: 경로 설정 변경

**`backend/ml_service/config.py`**:

```python
from pathlib import Path

# 변경 전
PREPARED_DIR = ML_SERVICE_DIR.parent / "prepared_v5"
NOTES_DB = ML_SERVICE_DIR.parent.parent / "database" / "waveform30.db"

# 변경 후 (외부 경로)
PREPARED_DIR = Path("/data/medviz_models/prepared_v5")
NOTES_DB = Path("/data/medviz_db/waveform30.db")
```

---

## 개발 환경 설정

### Python 가상환경 (권장)

#### Step 1: 가상환경 생성

```bash
cd ~/Projects/MedViz

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
source venv/bin/activate  # macOS/Linux
# 또는
.\venv\Scripts\activate   # Windows
```

#### Step 2: 의존성 설치

```bash
# 가상환경 활성화 후
pip install flask flask-cors numpy pandas scikit-learn faiss-cpu bottleneck
```

#### Step 3: 항상 가상환경 사용

```bash
# 터미널 1: ML Service
source venv/bin/activate
cd backend/ml_service
python app.py

# 터미널 2: 프론트엔드
source venv/bin/activate
cd frontend
python -m http.server 3000
```

### VS Code 설정

**`.vscode/settings.json` 생성**:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.python"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

**`.vscode/launch.json` 생성**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "ML Service",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/ml_service/app.py",
      "console": "integratedTerminal",
      "justMyCode": true
    }
  ]
}
```

### Git 설정 (선택)

**`.gitignore` 생성**:

```
# Python
venv/
__pycache__/
*.pyc
*.pyo
*.egg-info/

# 데이터 (큰 파일)
backend/prepared_v5/
database/*.db

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# 임시
.env
.env.local
```

**Git 초기화**:

```bash
cd ~/Projects/MedViz
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# .gitignore 추가 후
git add .
git commit -m "Initial commit"
```

---

## 배포 환경 설정

### 프로덕션 설정

#### 1️⃣ 환경 변수 설정

**`.env` 파일 생성**:

```bash
# ML Service
ML_PORT=5003
ML_HOST=0.0.0.0
FLASK_ENV=production

# 데이터
PREPARED_DIR=/opt/medviz/prepared_v5
NOTES_DB=/opt/medviz/database/waveform30.db

# 프론트엔드
FRONTEND_PORT=3000
API_BASE_URL=https://api.medviz.example.com
```

**`backend/ml_service/config.py` 수정**:

```python
import os
from dotenv import load_dotenv

load_dotenv()

ML_PORT = int(os.getenv('ML_PORT', 5003))
PREPARED_DIR = Path(os.getenv('PREPARED_DIR', ...))
NOTES_DB = Path(os.getenv('NOTES_DB', ...))
```

#### 2️⃣ CORS 설정

**`backend/ml_service/app.py`**:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# 개발 환경
CORS(app, origins=["http://localhost:3000"])

# 프로덕션 환경
if os.getenv('FLASK_ENV') == 'production':
    CORS(app, origins=[
        "https://yourdomain.com",
        "https://app.yourdomain.com"
    ])
```

#### 3️⃣ 프론트엔드 API 주소 설정

**`frontend/icudata.js`**:

```javascript
// 개발 환경
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:5003'
  : window.location.origin;

// 또는 환경 변수 사용
const ML_BASE = process.env.REACT_APP_API_URL || 
                (window.location.origin.includes(':3000') 
                  ? 'http://localhost:5003'
                  : window.location.origin);
```

### Docker 배포

**`Dockerfile`**:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 의존성
COPY requirements.txt .
RUN pip install -r requirements.txt

# 코드
COPY . .

# 환경 설정
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 5003 3000

CMD ["sh", "-c", "python backend/ml_service/app.py & python -m http.server 3000 -d frontend"]
```

**`docker-compose.yml`**:

```yaml
version: '3.8'

services:
  ml-service:
    build: .
    ports:
      - "5003:5003"
    environment:
      - FLASK_ENV=production
      - ML_PORT=5003
    volumes:
      - ./backend/prepared_v5:/app/backend/prepared_v5:ro
      - ./database:/app/database:ro
    restart: always

  frontend:
    build:
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - ml-service
    restart: always
```

**실행**:

```bash
docker-compose up -d
```

### Nginx 설정 (역프록시)

**`nginx.conf`**:

```nginx
upstream ml_service {
    server localhost:5003;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # 프론트엔드
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://ml_service/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🎯 커스터마이징 체크리스트

### 경로 커스터마이징

- [ ] 프로젝트 폴더를 원하는 위치로 이동 또는 복사
- [ ] 새 경로에서 모든 파일 확인 (`ls -la`)
- [ ] VS Code에서 새 경로로 프로젝트 열기

### 포트 커스터마이징

- [ ] `backend/ml_service/config.py`에서 `ML_PORT` 변경
- [ ] `frontend/icudata.js`에서 `ML_BASE` 업데이트
- [ ] 새 포트로 서비스 시작해서 정상 작동 확인

### 이름 커스터마이징

- [ ] 프로젝트 폴더 이름 변경
- [ ] workspace 파일 이름 변경 (선택)
- [ ] `README.md` 헤더 업데이트 (선택)

### 데이터 경로 커스터마이징

- [ ] 데이터가 프로젝트 내부에 있는지 확인
- [ ] 외부 위치면 심볼릭 링크 또는 경로 설정 변경

### 개발 환경 커스터마이징

- [ ] Python 가상환경 생성 (`python -m venv venv`)
- [ ] 의존성 설치 (`pip install ...`)
- [ ] VS Code 설정 파일 생성 (선택)
- [ ] `.gitignore` 생성 (선택)

### 배포 환경 커스터마이징

- [ ] `.env` 파일 생성
- [ ] CORS 설정 업데이트
- [ ] Docker 이미지 빌드 (선택)
- [ ] Nginx 설정 (선택)

---

## 🔍 문제 해결

### "모듈을 찾을 수 없음" 에러

```bash
# 가상환경 활성화 확인
which python  # → venv 경로여야 함

# 의존성 재설치
pip install -r requirements.txt
```

### 포트 충돌

```bash
# 현재 포트 상태 확인
lsof -i :5003
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 데이터 파일 못 찾음

```bash
# 파일 위치 확인
ls -la backend/prepared_v5/
ls -la database/waveform30.db

# 경로 설정 확인
cat backend/ml_service/config.py | grep DIR
```

---

## 📝 최종 정리

**당신의 환경 정보를 기록해두세요:**

```
프로젝트 경로: _________________________________
프론트엔드 포트: ______________________________
ML Service 포트: ______________________________
Python 경로: __________________________________
가상환경: ______________________________________
데이터 위치: __________________________________
배포 환경: ____________________________________
```

---

최종 업데이트: 2026-06-11
