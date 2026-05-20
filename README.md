# MedVis 🏥

의료 데이터 시각화 및 분석 플랫폼 | Medical Data Visualization & Analysis Platform

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003b57.svg)](https://www.sqlite.org/)

## 📋 개요

MedVis는 MIMIC-IV 데이터베이스를 기반으로 환자의 의료 기록과 생체신호를 시각적으로 분석하는 통합 플랫폼입니다.

**주요 기능:**
- 📊 환자 데이터 및 생체신호 시각화
- 🔍 직관적인 데이터 탐색 및 필터링
- 🏥 의료진을 위한 사용자 친화적 인터페이스
- ⚡ 실시간 데이터 조회

---

## 🗂️ 폴더 구조

```
MedVis/
├── README.md                    # 프로젝트 문서
├── .gitignore                   # Git 무시 설정
├── environment-base.yml         # 공통 Conda 환경
├── setup.sh                      # 자동 설정 스크립트
│
├── data/
│   └── mimic4wdb/
│       └── 0.1.0/              # MIMIC-IV 원본 데이터
│           └── [생체신호 데이터]
│
├── database/
│   ├── schema.sql              # SQLite 스키마
│   ├── init_db.py              # DB 초기화 스크립트
│   └── requirements.txt         # DB 관련 의존성
│
├── backend/
│   ├── app.py                  # Flask 메인 애플리케이션
│   ├── config.py               # 설정 파일
│   ├── requirements.txt         # Python 의존성
│   ├── .env.example            # 환경변수 예시
│   ├── api/
│   │   ├── routes.py           # API 엔드포인트
│   │   └── models.py           # DB 모델
│   ├── utils/
│   │   └── data_loader.py      # 데이터 처리 유틸
│   └── tests/
│       └── test_api.py         # API 테스트
│
├── frontend/
│   ├── package.json            # Node.js 의존성
│   ├── vite.config.js          # Vite 설정
│   ├── index.html
│   ├── .env.example            # 환경변수 예시
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/         # React 컴포넌트
│   │   ├── context/            # Context API
│   │   ├── services/           # API 호출 서비스
│   │   └── assets/
│   └── public/
│
├── docs/
│   ├── SETUP.md                # 자세한 설정 가이드
│   ├── API.md                  # API 문서
│   ├── DATABASE.md             # DB 스키마 가이드
│   └── DEPLOYMENT.md           # 배포 가이드
│
└── .github/
    └── workflows/              # CI/CD 설정
        ├── backend.yml
        └── frontend.yml
```

---

## 🚀 빠른 시작

### 필수 조건
- macOS / Linux / Windows
- Conda 설치 ([Miniconda 설치](https://docs.conda.io/projects/miniconda/en/latest/))
- Git

### 1단계: 저장소 복제
```bash
git clone https://github.com/your-org/MedVis.git
cd MedVis
```

### 2단계: 환경 설정 (자동)
```bash
bash setup.sh
```

또는 **수동 설정:**

```bash
# Conda 환경 생성
conda env create -f environment-base.yml
conda activate medvis

# Backend 의존성
cd backend && pip install -r requirements.txt && cd ..

# Frontend 의존성
cd frontend && npm install && cd ..

# Database 설정
cd database && python init_db.py && cd ..
```

### 3단계: 애플리케이션 실행

**터미널 1 - 백엔드 시작:**
```bash
conda activate medvis
cd backend
python app.py
```
→ 접속: `http://localhost:5000`

**터미널 2 - 프론트엔드 시작:**
```bash
conda activate medvis
cd frontend
npm run dev
```
→ 접속: `http://localhost:5174`

---

## 🔧 환경 설정

### 공통 환경 (환경-base.yml)
- **Python 3.11**
- **Node.js 20**
- **Conda 패키지 관리자**

### Backend 의존성 (backend/requirements.txt)
```
Flask==3.0.0
Flask-CORS==4.0.0
SQLAlchemy==2.0.0
python-dotenv==1.0.0
```

### Frontend 의존성 (frontend/package.json)
```
React 18.2.0
Vite 5.0.0
Axios (API 호출)
```

### 환경변수 설정

**backend/.env.example** → **backend/.env**로 복사
```env
DATABASE_URL=sqlite:///medvis.db
FLASK_ENV=development
API_PORT=5000
```

**frontend/.env.example** → **frontend/.env**로 복사
```env
VITE_API_URL=http://localhost:5000
```

---

## 📦 패키지 추가 방법

### Backend에 패키지 추가
```bash
cd backend
pip install [패키지명]
pip freeze > requirements.txt
```

### Frontend에 패키지 추가
```bash
cd frontend
npm install [패키지명]
# package.json이 자동 업데이트됨
```

### 모든 팀원이 필요한 Python 도구 추가
```bash
# environment-base.yml 수정 후
conda env update -f environment-base.yml
```

---

## 📊 API 문서

주요 엔드포인트:

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/patients` | 환자 목록 조회 |
| GET | `/api/patients/<id>` | 환자 상세 정보 |
| GET | `/api/waveforms/<patient_id>` | 생체신호 데이터 |
| POST | `/api/search` | 환자 검색 |

자세한 내용: [API.md](docs/API.md)

---

## 🗄️ 데이터베이스

**데이터베이스:** SQLite  
**원본 데이터:** `data/mimic4wdb/0.1.0/`

### DB 초기화
```bash
cd database
python init_db.py
```

스키마 상세: [DATABASE.md](docs/DATABASE.md)

---

## 👥 팀 협업 가이드

### 개발 워크플로우
1. **feature 브랜치 생성**: `git checkout -b feature/기능명`
2. **코드 작성** (각자 담당 영역)
3. **테스트**: `npm run test` (frontend) / `pytest` (backend)
4. **Push & PR**: GitHub에서 Pull Request 생성
5. **Review & Merge**

### 브랜치 전략
- `main`: 배포 브랜치
- `develop`: 통합 개발 브랜치
- `feature/*`: 기능별 개발 브랜치
- `fix/*`: 버그 수정 브랜치

---

## 🧪 테스트 실행

### Backend 테스트
```bash
cd backend
pytest tests/
```

### Frontend 테스트
```bash
cd frontend
npm run test
```

---

## 📝 주요 파일 설명

| 파일 | 설명 |
|------|------|
| `environment-base.yml` | 모든 팀원이 사용하는 공통 Python/Node 환경 |
| `backend/requirements.txt` | Backend 전용 Python 패키지 |
| `frontend/package.json` | Frontend 전용 Node 패키지 |
| `database/schema.sql` | SQLite 데이터베이스 스키마 |
| `setup.sh` | 자동 설정 스크립트 |

---

## 🚢 배포

### 환경 설정
[DEPLOYMENT.md](docs/DEPLOYMENT.md) 참고

### 배포 체크리스트
- [ ] 환경변수 설정 확인
- [ ] 데이터베이스 마이그레이션
- [ ] API 엔드포인트 테스트
- [ ] CORS 설정 확인
- [ ] CI/CD 파이프라인 실행

---

## 🐛 문제 해결

### Backend가 실행되지 않을 때
```bash
# 가상환경 재생성
conda deactivate
conda env remove -n medvis
bash setup.sh
```

### 포트 충돌
```bash
# 이미 사용 중인 포트 확인 (macOS/Linux)
lsof -i :5000
lsof -i :5174

# 프로세스 종료
kill -9 <PID>
```

### 데이터를 불러올 수 없을 때
```bash
# DB 초기화
cd database
python init_db.py
```

---

## 📚 추가 문서
- [자세한 설정 가이드](docs/SETUP.md)
- [API 문서](docs/API.md)
- [데이터베이스 가이드](docs/DATABASE.md)
- [배포 가이드](docs/DEPLOYMENT.md)

---

## 🤝 기여 방법

1. 저장소를 포크합니다
2. 기능 브랜치 생성: `git checkout -b feature/AmazingFeature`
3. 변경사항 커밋: `git commit -m 'Add some AmazingFeature'`
4. 브랜치에 푸시: `git push origin feature/AmazingFeature`
5. Pull Request 생성

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 📧 연락처

프로젝트 관리자: [@your-github](https://github.com/your-github)

---

**마지막 업데이트:** 2026년 5월 20일
