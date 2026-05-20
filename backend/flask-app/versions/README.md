# 📁 MedVis 버전 관리 가이드

## 📍 파일 구조

```
MedVis/
├── backend-workshop-main/flask-app/
│   ├── app.py                          ← 현재 실행 중 (v1 기반)
│   ├── app.py.backup                   ← 이전 백업
│   ├── app_new.py                      ← 임시 파일 (삭제 가능)
│   └── versions/
│       ├── app_v1.py                   ✅ v1 안정 버전 (합성 데이터)
│       └── app_v2.py                   🚧 v2 개발 버전 (MIMIC-IV 데이터)
│
├── medical-frontend/src/
│   ├── components/
│   │   ├── PatientList.jsx             ← 현재 실행 중 (v1)
│   │   ├── PatientCard.jsx             ← 현재 실행 중 (v1)
│   │   └── WaveformDetail.jsx          ← 현재 실행 중 (v1)
│   │
│   └── versions/
│       ├── PatientList_v1.jsx          ✅ v1 안정 버전
│       ├── PatientCard_v1.jsx          ✅ v1 안정 버전
│       └── WaveformDetail_v1.jsx       ✅ v1 안정 버전
│
└── VERSION_MANAGEMENT.md               ← 상세 버전 가이드
```

---

## 🚀 빠른 시작

### v1 (현재 배포)
```bash
# 포트 5001에서 실행
cd backend-workshop-main/flask-app
python app.py

# 프론트엔드 (포트 5174)
cd medical-frontend
npm run dev
```

### v2 (개발 진행)
```bash
# 포트 5002에서 v2 백엔드 시작
cd backend-workshop-main/flask-app
python versions/app_v2.py

# 필수 패키지 설치
pip install wfdb==4.1.1
```

---

## 📊 버전 비교

| 항목 | v1 | v2 |
|------|----|----|
| 데이터 | NumPy 합성 | MIMIC-IV 실제 |
| 캐싱 | 메모리만 | 메모리 + 디스크 |
| 환자 수 | 15명 (고정) | 무제한 |
| 성능 | ~200-500ms | ~100-1000ms |
| 포트 | 5001 | 5002 |
| 상태 | ✅ 안정 | 🚧 개발 중 |

---

## 🔧 버전 전환하기

### 1️⃣ v1 → v2 커스터마이제이션
```javascript
// PatientList.jsx v2 버전 생성 시
const API_BASE = 'http://localhost:5002/api';  // 포트 변경
```

### 2️⃣ 동시 실행 (테스트용)
```bash
# 터미널 1: v1
python app.py  # 포트 5001

# 터미널 2: v2
python versions/app_v2.py  # 포트 5002

# 프론트엔드에서 환경 변수로 선택
VITE_API_PORT=5001  # 또는 5002
```

### 3️⃣ 완전 전환
```bash
# app.py를 v2로 교체
cp flask-app/versions/app_v2.py flask-app/app.py
python app.py  # 포트 5001에서 v2 실행
```

---

## ✨ 신규 기능 (v2에서 추가)

### 백엔드 신규 API
- `POST /api/cache/clear` - 캐시 초기화
- 향상된 `GET /api/health`:
  ```json
  {
    "status": "ok",
    "version": "v2",
    "wfdb": "설치됨",
    "mimic_data": true,
    "cache_size": 5
  }
  ```

### 캐시 시스템
```
/tmp/medvis_cache/
├── waveform_1.pkl
├── waveform_2.pkl
└── ...
```

### 데이터 소스 자동 선택
- MIMIC 파일 있음 → 실제 데이터 로드
- MIMIC 파일 없음 → 합성 데이터로 폴백

---

## 🐛 문제 해결

### "환자 데이터를 불러올 수 없습니다"
```bash
# 1. 백엔드가 실행 중인지 확인
lsof -i :5001
lsof -i :5002

# 2. 포트가 사용 중이면 프로세스 종료
kill -9 <PID>

# 3. 백엔드 재시작
python app.py
```

### MIMIC 데이터를 찾을 수 없음 (v2)
```bash
# 1. wfdb 설치 확인
pip list | grep wfdb

# 2. MIMIC 경로 확인
ls /Users/kyj/Documents/2026-1/MedVis/physionet.org/files/mimic4wdb/

# 3. v2 상태 확인
curl http://localhost:5002/api/health
```

### 캐시 초기화
```bash
# v2에서 제공하는 API 사용
curl -X POST http://localhost:5002/api/cache/clear

# 또는 수동 삭제
rm -rf /tmp/medvis_cache/*
```

---

## 📝 마이그레이션 체크리스트

v1에서 v2로 전환할 때 확인 사항:

- [ ] app_v2.py 테스트 완료
- [ ] MIMIC-IV 데이터 경로 확인
- [ ] wfdb 라이브러리 설치
- [ ] 캐시 디렉토리 권한 확인 (/tmp/medvis_cache)
- [ ] 프론트엔드 API 포트 업데이트
- [ ] v1 백업 확인 (versions/app_v1.py)
- [ ] 본 환경에서 성능 테스트
- [ ] 사용자 공지

---

## 🗓️ 타임라인

| 시점 | 상태 | 설명 |
|------|------|------|
| 2026-05-18 | ✅ | v1 안정화 완료 |
| 현재 | 🚧 | v2 개발 진행 (MIMIC-IV 통합) |
| 예정 | 📋 | v2 베타 테스트 |
| 예정 | 📋 | v1 → v2 완전 전환 |

---

## 📞 더 알아보기

자세한 내용은 [VERSION_MANAGEMENT.md](./VERSION_MANAGEMENT.md) 참고

