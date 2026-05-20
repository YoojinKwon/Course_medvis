# MedVis 버전 관리 문서

## 📋 개요

MedVis 프로젝트는 **v1 (현재 안정 버전)** 과 **v2 (향후 개선 버전)** 으로 구분하여 관리합니다.

---

## 🔧 백엔드 비교

### **Version 1 (app_v1.py)** - 현재 배포
- **데이터 소스**: NumPy 합성 데이터
- **캐싱**: 메모리 캐시만 사용 (딕셔너리)
- **환자 수**: 고정 15명
- **성능**: 
  - API 응답: ~200-500ms
  - 메모리 사용: ~20-50MB
- **포트**: 5001
- **상태**: ✅ 안정적 (프로덕션 가능)

**파일 위치**: 
```
/Users/kyj/Documents/2026-1/MedVis/backend-workshop-main/flask-app/
├── app.py (현재 실행 중)
└── versions/
    └── app_v1.py (백업)
```

---

### **Version 2 (app_v2.py)** - 개발 진행 중
- **데이터 소스**: MIMIC-IV 실제 파형 데이터 (wfdb 라이브러리)
- **캐싱**: 메모리 + 디스크 캐시 (하이브리드)
- **환자 수**: 무제한 확장 (데이터셋에 따름)
- **성능**:
  - 첫 요청: ~500ms-1s (파일 I/O)
  - 캐시 히트: ~100-200ms
  - 메모리: 1GB+ (설정 가능)
- **포트**: 5002
- **상태**: 🚧 개발 중

**파일 위치**:
```
/Users/kyj/Documents/2026-1/MedVis/backend-workshop-main/flask-app/versions/app_v2.py
```

**v2 신규 기능**:
- API: `POST /api/cache/clear` - 캐시 초기화
- API: `GET /api/health` - 상세 시스템 정보
  - wfdb 설치 여부
  - MIMIC 데이터 경로
  - 캐시 크기

---

## 🎨 프론트엔드 구조

### **Version 1 (현재 활성)**
- **위치**: `/src/components/`
  - `PatientList.jsx` - 환자 목록 (위험도 정렬, 검색)
  - `PatientCard.jsx` - 환자 카드 (생체 신호, 위험도 배지)
  - `WaveformDetail.jsx` - 파형 분석 페이지 (Top 5 유사 환자, 구간별 비교)

**주요 특징**:
- Recharts 라이브러리로 시각화
- 반응형 레이아웃 (CSS Grid)
- API 포트: 5001

### **Version 2 (v2 컴포넌트 개발 예정)**
**위치**: `/src/versions/`
- `PatientList_v2.jsx` - 고급 필터링 및 정렬
- `WaveformDetail_v2.jsx` - 실시간 데이터 스트리밍 UI
- 새 컴포넌트:
  - `WaveformComparison.jsx` - 고급 파형 비교
  - `CacheManager.jsx` - 캐시 통계 및 관리
  - `DataSourceSelector.jsx` - MIMIC vs 합성 데이터 선택

---

## 🚀 마이그레이션 가이드

### v1 → v2로 전환하기

#### 1. 백엔드 전환
```bash
# v2 시작 (포트 5002)
cd /Users/kyj/Documents/2026-1/MedVis/backend-workshop-main/flask-app
python versions/app_v2.py

# 동시 실행 시 (포트 5001, 5002 동시 사용)
# v1: python app.py (포트 5001)
# v2: python versions/app_v2.py (포트 5002)
```

#### 2. 프론트엔드 포트 변경
```javascript
// v2 사용 시 PatientList_v2.jsx에서:
const API_BASE = 'http://localhost:5002/api';
```

#### 3. 필수 패키지 (v2용)
```bash
pip install wfdb==4.1.1  # MIMIC-IV 데이터 읽기
```

---

## 📊 API 비교

| 엔드포인트 | v1 | v2 | 설명 |
|-----------|----|----|-----|
| `GET /api/patients` | ✅ | ✅ | 환자 목록 |
| `GET /api/waveforms/<id>` | ✅ | ✅ | 파형 데이터 |
| `GET /api/waveforms/<id>/similar` | ✅ | ✅ | 상위 5개 유사 환자 |
| `GET /api/waveforms/<id>/compare/<other_id>` | ✅ | ✅ | 구간별 유사도 비교 |
| `GET /api/health` | ✅ | ✅+ | v2: 상세 정보 반환 |
| `POST /api/cache/clear` | ❌ | ✅ | 캐시 초기화 |

---

## 💾 데이터 경로

### v1 (합성 데이터)
- 생성 위치: 메모리 (런타임)
- 캐시: 없음
- 복구 불가능

### v2 (MIMIC-IV 실제 데이터)
```
/Users/kyj/Documents/2026-1/MedVis/physionet.org/
└── files/mimic4wdb/0.1.0/waves/p100/
    ├── p10014354/
    │   └── 81739927/
    │       ├── 81739927.hea (메인 헤더)
    │       ├── 81739927_0000.hea (구간 헤더)
    │       ├── 81739927_0000e.dat (ECG 데이터)
    │       ├── 81739927_0000p.dat (맥박 데이터)
    │       └── 81739927_0000r.dat (호흡 데이터)
    ├── p10019003/
    ├── p10020306/
    └── ...
```

**캐시 경로** (v2):
```
/tmp/medvis_cache/
├── waveform_1.pkl
├── waveform_2.pkl
└── ...
```

---

## 📈 성능 비교

### v1 (합성 데이터)
```
환자 수: 15명 (고정)
초기 로드: ~2초
메모리: 50MB
병렬 처리: 지원 안 함
```

### v2 (MIMIC-IV 실제)
```
환자 수: 무제한
초기 로드: ~1초 (메타데이터만)
메모리: 500MB-2GB (설정 가능)
병렬 처리: 지원 (스레드 풀)
디스크 I/O: 최적화 (캐싱)
```

---

## 🔄 동시 운영 전략

### 개발 중 v1, v2 동시 실행
```bash
# 터미널 1: v1 실행 (포트 5001)
conda activate medvis
cd backend-workshop-main/flask-app
python app.py

# 터미널 2: v2 실행 (포트 5002)
conda activate medvis
cd backend-workshop-main/flask-app
python versions/app_v2.py
```

### 프론트엔드에서 버전 선택
```javascript
// .env 파일
VITE_API_VERSION=v1  # 또는 v2
VITE_API_PORT=5001   # 또는 5002

// main.jsx에서
const API_PORT = import.meta.env.VITE_API_PORT || 5001;
```

---

## ✅ 체크리스트

### v2 완성 조건
- [ ] MIMIC-IV wfdb 라이브러리 통합
- [ ] 디스크 캐싱 완성
- [ ] 대규모 데이터셋 성능 테스트
- [ ] 실시간 스트리밍 UI
- [ ] 에러 처리 및 로깅
- [ ] 보안 및 인증 (선택적)

### 마이그레이션 일정
- 🟦 **Phase 1** (현재): v1 안정화 + v2 개발
- 🔜 **Phase 2**: v2 베타 테스트
- 🔜 **Phase 3**: v1 → v2 완전 전환
- 🔜 **Phase 4**: v1 아카이브

---

## 📞 문제 해결

### v1 실행 오류
```bash
# 포트 5001이 이미 사용 중인 경우
lsof -i :5001
kill -9 <PID>

# 환자 데이터가 로드되지 않는 경우
# app.py의 initialize_patients()가 호출되는지 확인
```

### v2 MIMIC 데이터 못 찾음
```bash
# wfdb 설치 확인
pip list | grep wfdb

# MIMIC 경로 확인
ls /Users/kyj/Documents/2026-1/MedVis/physionet.org/files/mimic4wdb/0.1.0/waves/p100/

# v2 로그에서 데이터 소스 확인
curl http://localhost:5002/api/health
```

---

## 📝 향후 계획

### v2 기능 로드맵
1. **실시간 스트리밍** - WebSocket 기반 라이브 데이터
2. **AI 진단** - 머신러닝 기반 이상 감지
3. **모바일 지원** - React Native 앱
4. **클라우드 배포** - AWS/Google Cloud
5. **멀티테넌시** - 병원별 데이터 격리

---

**마지막 업데이트**: 2026-05-18
**작성자**: MedVis 개발팀
