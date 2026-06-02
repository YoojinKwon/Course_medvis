# MedVis Frontend

의료 파형 모니터링 대시보드 - 환자 생체신호 스트리밍 및 유사 신호 검색 UI

## 📋 개요

MedVis는 MIMIC-IV 데이터베이스의 생체신호를 시각화하고 분석하는 웹 기반 의료 모니터링 시스템입니다. 실시간 스트리밍 차트와 유사 신호 발견 기능을 제공합니다.

## ✨ 주요 기능

### 1. 2열 분할 레이아웃 (20% - 80%)
- **좌측 패널 (20%)**: 최대 6명 환자의 미니 카드 및 스트리밍 차트 (위험도 기반 정렬)
- **우측 패널 (80%)**: 3개 섹션으로 구성
  - **상단 (40%)**: 선택된 환자의 상세 파형 뷰어
  - **중간 (15%)**: 타임라인 제어 및 필터링
  - **하단 (45%)**: 유사 신호 검색 결과 (RAG 플레이스홀더 포함)

### 2. 실시간 스트리밍 차트
- **미니 차트**: 100점 슬라이딩 윈도우, 5pts/200ms 간격
- **상세 차트**: 500점 슬라이딩 윈도우, 20pts/200ms 간격
- TradingView 다크 테마 적용 (틸색강조)

### 3. 환자 관리
- 위험도별 정렬 (HIGH → MEDIUM → LOW)
- 실시간 검색 필터링
- 위험 레벨 배지 (색상 코딩)

### 4. 유사 신호 발견 UI
- 유사 신호 아이템 (미니 차트 + 하이라이트 영역)
- 임상 정보 팝오버 (DetailModal)
- 정렬 및 필터링 컨트롤

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── components/
│   │   ├── PatientList.jsx          # 메인 대시보드 컴포넌트
│   │   ├── PatientList.css
│   │   ├── PatientCard.jsx          # 환자 카드
│   │   ├── PatientCard.css
│   │   ├── WaveformDetail.jsx       # 상세 파형 뷰어
│   │   ├── WaveformDetail.css
│   │   ├── SimilarSignalsList.jsx   # 유사 신호 목록
│   │   ├── SimilarSignalsList.css
│   │   ├── SimilarSignalItem.jsx    # 개별 유사 신호 아이템
│   │   ├── SimilarSignalItem.css
│   │   ├── DetailModal.jsx          # 임상 정보 팝오버
│   │   └── DetailModal.css
│   ├── utils/
│   │   └── dummySimilarSignals.js   # 더미 데이터 (RAG 플레이스홀더)
│   ├── context/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── public/
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 시작하기

### 종속성 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```
Vite 개발 서버가 `http://localhost:5176`에서 시작됩니다 (HMR 활성화)

### 프로덕션 빌드
```bash
npm run build
```

### 빌드 사전 확인
```bash
npm run preview
```

## 🛠 기술 스택

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| React | 19.2.6 | UI 프레임워크 |
| Vite | 8.0.13 | 빌드 도구 |
| Recharts | 3.8.1 | 차트 시각화 |
| Tailwind CSS | 4.3.0 | 유틸리티 스타일링 |
| ESLint | 9.x | 코드 품질 검사 |

## 🎨 테마 및 스타일

### 색상 변수 (PatientList.css)
```css
--color-bg-dark: #262934           /* 페이지 배경 */
--color-bg-card-alt: #1c2030       /* 차트 컨테이너 */
--color-border: #131722            /* 테두리 */
--color-text-primary: #d1d4dc      /* 주 텍스트 */
--color-text-secondary: #787b86    /* 보조 텍스트 */
--color-primary: #2962ff           /* 액센트 (파란색) */
```

### 위험도 배지 색상
- **HIGH**: 빨강 (#ef5350)
- **MEDIUM**: 주황색 (#ffb74d)
- **LOW**: 초록색 (#66bb6a)

## 📊 데이터 소스

### 백엔드 API
- **주소**: `http://localhost:5001/api/waveforms/{patientID}/{examID}/{channel}`
- **응답 형식**: `{ t: [...], value: [...] }` (시간 배열, 값 배열)

### 더미 데이터
유사 신호 검색은 현재 더미 데이터를 사용합니다 (`utils/dummySimilarSignals.js` 참조).
RAG 통합은 향후 실제 AI 기반 유사성 검색으로 교체될 계획입니다.

## 🔧 주요 컴포넌트

### PatientList.jsx
메인 대시보드 컴포넌트로 다음을 관리합니다:
- 환자 목록 렌더링 및 스트리밍
- 파형 데이터 페칭 및 상태 관리
- 우측 패널의 3개 섹션 컨트롤

**주요 함수**:
- `getRiskLevelValue()`: 환자 위험도 계산
- `convertWaveformData()`: 백엔드 데이터를 차트 포맷으로 변환

### WaveformDetail.jsx
선택된 환자의 상세 파형을 표시하는 Recharts LineChart

### SimilarSignalsList.jsx & SimilarSignalItem.jsx
유사 신호 검색 결과를 표시하고 임상 정보 팝오버를 제공합니다.

## ⚙️ 설정

### Vite 설정
`vite.config.js`에서 설정 가능:
- HMR 활성화
- React 플러그인 사용 (Oxc)
- 출력 포맷 설정

### ESLint
기본 ESLint 규칙이 적용되어 있습니다. 프로덕션 애플리케이션의 경우 TypeScript와 함께 type-aware 규칙 사용을 권장합니다.

## 📝 코드 최적화

최근 최적화 사항:
- ✅ 중복 유틸리티 함수 추출 및 중앙화
- ✅ 불필요한 상태 변수 제거 (`detailStreamData`)
- ✅ 중복 useEffect 제거
- ✅ CSS 문법 오류 수정

## 🚧 개발 로드맵

- [ ] RAG 기반 유사 신호 검색 통합
- [ ] 실시간 위험도 알고리즘 구현
- [ ] 환자 목록 가상화 (100+명 support)
- [ ] 에러 처리 및 로딩 상태 개선
- [ ] 내보내기/리포팅 기능
- [ ] TypeScript 마이그레이션

## 📄 라이선스

이 프로젝트는 교육용입니다. MIMIC-IV 데이터베이스 이용 약관을 준수합니다.
