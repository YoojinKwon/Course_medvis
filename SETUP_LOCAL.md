# 로컬 실행 가이드 (데이터 배치 + 서버 3개 실행)

이 저장소(`Course_medvis`)는 **코드만** 들어 있습니다. MIMIC-IV에서 파생된 데이터(환자
파형, 모델, 임베딩 등)는 PhysioNet 데이터 사용 약관상 public 저장소에 커밋하지 않고
**직접 전달**받아 별도로 배치해야 합니다.

## 1. 보낼 파일 — 정확히 이 목록만 (총 8개: 파일 6 + 폴더 2)

### (A) ml_service용 — `prepared_v5/`에서 파일 6개

| # | 파일 | 크기 |
|---|---|---|
| 1 | `channels.json` | <1KB |
| 2 | `metadata_v2.csv` | 16MB |
| 3 | `linear_classifier.pkl` | 0.1MB |
| 4 | `linear_faiss.bin` | 34MB |
| 5 | `windows.npy` | **2.4GB** (가장 큼) |
| 6 | `shap_3d.npy` | 152MB |

> 이 6개는 `ml_service/core/model_loader.py`의 `REQUIRED_FILES`에 정의된 목록과
> 정확히 일치합니다 — 누락되면 실행 시 어떤 파일이 없는지 에러 메시지로 알려줍니다.
> `scaler_v2.pkl`, `stats_v2.json`, `embeddings.npy`, `faiss_index.bin`, `classifier.pkl`
> (MOMENT 관련) 등은 코드에서 읽지 않으므로 **보낼 필요 없음**.

### (B) flask-app용 — `data/mimic4wdb/waves/`에서 폴더 2개

| # | 폴더 | 크기 |
|---|---|---|
| 7 | `p100/` (전체) | 17MB |
| 8 | `p101/p10112163/` | 5.9MB |

## 2. 정확히 어디에 넣어야 하는지

`Course_medvis`를 클론한 폴더를 `<작업폴더>`라 하면, **`<작업폴더>` 바로 아래에
(=Course_medvis와 형제 위치에)** 새 폴더 `prepared_v5`, `data`를 만들고 그 안에 넣습니다.
**`Course_medvis` 폴더 안에 넣으면 안 됩니다.**

```
<작업폴더>/
├── Course_medvis/                                    ← git clone 결과 (건드리지 않음)
│
├── prepared_v5/                                      ← 새로 만드는 폴더
│   ├── channels.json                                 ← (1)
│   ├── metadata_v2.csv                               ← (2)
│   ├── linear_classifier.pkl                         ← (3)
│   ├── linear_faiss.bin                              ← (4)
│   ├── windows.npy                                   ← (5)
│   └── shap_3d.npy                                   ← (6)
│
└── data/
    └── mimic4wdb/
        └── waves/
            ├── p100/                                 ← (7) 폴더 전체를 그대로
            └── p101/
                └── p10112163/                        ← (8)
```

예) `C:\Users\누군가\projects\Course_medvis`로 클론했다면
`C:\Users\누군가\projects\prepared_v5\...`,
`C:\Users\누군가\projects\data\mimic4wdb\waves\...` 가 됩니다.

코드가 `Course_medvis` 위치를 기준으로 상위 폴더를 거슬러 올라가며 `prepared_v5/`,
`data/`를 자동으로 찾으므로(폴더 이름·상대 위치만 맞으면) 별도 설정 변경은 필요 없습니다.
파일이 빠져 있으면 `ml_service` 실행 시 **어떤 파일이 없는지** 콘솔에 명시적으로
알려줍니다.

## 3. 실행 방법 (서버 3개를 각각 다른 터미널에서)

### ① ml_service — ML 추론 API (포트 5003)
```bash
cd Course_medvis/backend/ml_service
pip install -r requirements.txt
python app.py
```
- `[ML Service] Running on http://localhost:5003` 출력되면 정상
- 13만 개 윈도우의 위험도를 미리 계산하므로 **로딩에 1~2분** 정도 걸립니다

### ② flask-app — 파형 데이터 API (포트 5002)
```bash
cd Course_medvis/backend/flask-app
pip install -r requirements.txt
python app.py
```
- `✅ N명의 환자 데이터 로드 완료` 메시지가 보이면 정상

### ③ frontend — 대시보드 (Vite, 기본 포트 5173)
```bash
cd Course_medvis/frontend
npm install
npm run dev
```
- 콘솔에 표시되는 주소(보통 `http://localhost:5173`)로 접속

> **세 서버가 모두 떠 있어야** 대시보드가 정상 동작합니다
> (frontend는 `localhost:5002`와 `localhost:5003` API를 동시에 호출합니다).

## 4. 참고: 현재 모델 현황

- **위험도 예측 / 유사 신호 검색 모두 Linear 모델(raw signal → LogisticRegression, PCA 임베딩) 기반**으로 동작 중입니다.
- MOMENT(시계열 파운데이션 모델) fine-tuning이 끝나면 `ml_service/config.py`의
  `LINEAR_FAISS_BIN` → MOMENT 기반 `faiss_index.bin`/`embeddings.npy`로 교체할 예정입니다.
