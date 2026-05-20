# 자세한 설정 가이드

이 가이드는 MedVis 개발 환경을 설정하는 방법을 자세히 설명합니다.

## 📋 목차

1. [필수 요구 사항](#필수-요구-사항)
2. [자동 설정 (권장)](#자동-설정-권장)
3. [수동 설정](#수동-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [애플리케이션 실행](#애플리케이션-실행)
6. [문제 해결](#문제-해결)
7. [패키지 업데이트](#패키지-업데이트)

---

## 필수 요구 사항

### 시스템 요구 사항
- **OS**: macOS 10.14+, Ubuntu 18.04+, Windows 10+ (WSL2 권장)
- **RAM**: 최소 4GB (8GB 권장)
- **디스크**: 최소 10GB 여유 공간

### 설치 필수 소프트웨어
- **Conda/Miniconda** ([설치 링크](https://docs.conda.io/projects/miniconda/en/latest/))
- **Git** ([설치 링크](https://git-scm.com/))
- **Terminal** (macOS/Linux) 또는 **PowerShell/CMD** (Windows)

### Conda 설치 확인
```bash
conda --version
# conda 4.10.0 이상 필요
```

---

## 자동 설정 (권장)

가장 빠르고 간단한 방법입니다.

### Step 1: 저장소 복제
```bash
git clone https://github.com/your-org/MedVis.git
cd MedVis
```

### Step 2: 자동 설정 스크립트 실행

**macOS/Linux:**
```bash
bash setup.sh
```

**Windows (Git Bash 또는 WSL2):**
```bash
bash setup.sh
```

### Step 3: 완료 메시지 확인
```
✅ 설정이 완료되었습니다!
```

> **📌 참고**: 스크립트 실행 중 오류가 발생하면 [문제 해결](#문제-해결) 섹션을 참고하세요.

---

## 수동 설정

자동 설정이 작동하지 않을 경우 수동으로 설정하세요.

### Step 1: 저장소 복제
```bash
git clone https://github.com/your-org/MedVis.git
cd MedVis
```

### Step 2: Conda 환경 생성
```bash
# 공통 환경 생성
conda env create -f environment-base.yml

# 환경 활성화
conda activate medvis
```

### Step 3: Backend 의존성 설치
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Step 4: Frontend 의존성 설치
```bash
cd frontend
npm install
cd ..
```

### Step 5: Database 초기화
```bash
cd database
pip install -r requirements.txt
python init_db.py
cd ..
```

### Step 6: 환경 변수 설정
[환경 변수 설정](#환경-변수-설정) 섹션 참고

---

## 환경 변수 설정

### Backend 환경 변수

**파일**: `backend/.env`

```bash
# 복사
cp backend/.env.example backend/.env
```

**내용 확인 및 수정:**
```env
# 데이터베이스 설정
DATABASE_URL=sqlite:///medvis.db

# Flask 설정
FLASK_ENV=development
FLASK_DEBUG=1

# API 포트
API_PORT=5000
CORS_ORIGINS=http://localhost:5174
```

### Frontend 환경 변수

**파일**: `frontend/.env`

```bash
# 복사
cp frontend/.env.example frontend/.env
```

**내용 확인 및 수정:**
```env
# Backend API URL
VITE_API_URL=http://localhost:5000

# 개발 환경 설정
VITE_DEBUG=true
```

---

## 애플리케이션 실행

### 방법 1: 동시 실행 (권장)

**터미널 1 - Backend 시작:**
```bash
conda activate medvis
cd backend
python app.py
```
→ 출력: `Running on http://127.0.0.1:5000`

**터미널 2 - Frontend 시작:**
```bash
conda activate medvis
cd frontend
npm run dev
```
→ 출력: `Local: http://localhost:5174`

### 방법 2: 백그라운드 실행

**Backend (macOS/Linux):**
```bash
cd backend
python app.py > /tmp/flask.log 2>&1 &
echo $! > /tmp/flask.pid
```

**Frontend (macOS/Linux):**
```bash
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
echo $! > /tmp/frontend.pid
```

**종료하기:**
```bash
# Backend 종료
kill $(cat /tmp/flask.pid)

# Frontend 종료
lsof -i :5174 | grep -v PID | awk '{print $2}' | xargs kill -9
```

---

## 문제 해결

### 1. Conda 환경 생성 실패

**증상**: `CondaError: Solving environment: failed` 또는 오류 메시지

**해결책:**
```bash
# Conda 업데이트
conda update -n base -c defaults conda

# 환경 재생성
conda env remove -n medvis
conda env create -f environment-base.yml
```

### 2. Python 패키지 설치 오류

**증상**: `ERROR: Could not find a version that satisfies the requirement`

**해결책:**
```bash
# pip 업데이트
pip install --upgrade pip

# 캐시 삭제
pip cache purge

# 재시도
pip install -r requirements.txt
```

### 3. Node/npm 문제

**증상**: `npm: command not found` 또는 npm 오류

**해결책:**
```bash
# Node 버전 확인
node --version
npm --version

# 환경이 없으면 재생성
conda env remove -n medvis
conda env create -f environment-base.yml
conda activate medvis
```

### 4. 포트 충돌

**증상**: `Address already in use` 또는 포트 에러

**해결책:**
```bash
# macOS/Linux - 포트 확인
lsof -i :5000
lsof -i :5174

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
FLASK_PORT=5001 python app.py
```

### 5. 데이터베이스 오류

**증상**: `database is locked` 또는 DB 관련 오류

**해결책:**
```bash
# DB 재초기화
cd database
rm medvis.db
python init_db.py
cd ..
```

### 6. CORS 에러

**증상**: `Access to XMLHttpRequest has been blocked by CORS policy`

**해결책:**
Frontend의 API 호출 URL 확인:
```javascript
// src/services/api.js
const API_URL = process.env.VITE_API_URL;
// ✓ 올바른 형식: http://localhost:5000
```

Backend `.env`에서 CORS 설정 확인:
```env
CORS_ORIGINS=http://localhost:5174
```

### 7. 권한 오류 (Permission Denied)

**증상**: `Permission denied: './setup.sh'` 또는 비슷한 오류

**해결책:**
```bash
# setup.sh에 실행 권한 부여
chmod +x setup.sh
bash setup.sh
```

---

## 패키지 업데이트

### Backend 패키지 추가

새로운 Python 패키지가 필요한 경우:

```bash
cd backend
pip install [패키지명]
pip freeze > requirements.txt
```

예시:
```bash
cd backend
pip install pandas numpy
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Add pandas and numpy dependencies"
```

### Frontend 패키지 추가

새로운 npm 패키지가 필요한 경우:

```bash
cd frontend
npm install [패키지명]
# package.json이 자동 업데이트됨
```

예시:
```bash
cd frontend
npm install axios
git add package.json package-lock.json
git commit -m "Add axios for HTTP requests"
```

### 공통 Python 환경 업데이트

모든 팀원이 필요로 하는 도구를 추가:

```bash
# environment-base.yml에서 dependencies 섹션 수정
# 그 후:
conda env update -f environment-base.yml
```

### 전체 의존성 업데이트

모든 패키지를 최신 버전으로 업데이트:

**신중하게 실행하세요!**

```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm update
```

---

## 환경 변수 공유

팀원들이 설정할 수 있도록 예시 파일을 제공하세요:

- `backend/.env.example`
- `frontend/.env.example`

이 파일들은 Git에 커밋하되, 실제 `.env` 파일은 `.gitignore`에 추가되어 있으므로 공유되지 않습니다.

---

## 개발 팁

### VS Code 확장 권장

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ES7-React/react-js-snippets"
  ]
}
```

### Conda 환경 활성화 자동화

**bashrc/zshrc에 추가 (선택사항):**
```bash
# MedVis 프로젝트 디렉토리 진입 시 자동 활성화
function cd() {
  builtin cd "$@"
  if [ -f "environment-base.yml" ]; then
    conda activate medvis
  fi
}
```

### 빠른 명령어 모음

```bash
# 전체 재설정
bash setup.sh

# 동시 실행 (macOS/Linux)
(cd backend && python app.py) & (cd frontend && npm run dev)

# Backend만 실행
cd backend && python app.py

# Frontend만 실행
cd frontend && npm run dev

# Database 초기화
cd database && python init_db.py
```

---

## 추가 도움말

문제가 발생하면:

1. 이 문서의 [문제 해결](#문제-해결) 섹션 확인
2. GitHub Issues에서 질문
3. 팀 리더에게 문의

---

**마지막 업데이트**: 2026년 5월 20일
