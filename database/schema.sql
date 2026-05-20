-- MedVis Database Schema (SQLite)
-- MIMIC-IV 데이터 기반 의료 정보 관리

-- 환자 테이블
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY,
    gender TEXT,
    dob DATE,
    dod DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 진료 기록 테이블
CREATE TABLE IF NOT EXISTS admissions (
    hadm_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    admittime DATETIME,
    dischargetime DATETIME,
    admission_type TEXT,
    admission_location TEXT,
    discharge_location TEXT,
    diagnosis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- 임상 노트 테이블
CREATE TABLE IF NOT EXISTS notes (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    hadm_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    note_type TEXT,
    note_date DATETIME,
    note_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hadm_id) REFERENCES admissions(hadm_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- 생체신호 (Waveform) 데이터 메타데이터
CREATE TABLE IF NOT EXISTS waveforms (
    waveform_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    hadm_id INTEGER,
    study_id TEXT,
    signal_type TEXT,
    file_path TEXT,
    start_time DATETIME,
    end_time DATETIME,
    sampling_rate REAL,
    duration_minutes REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (hadm_id) REFERENCES admissions(hadm_id)
);

-- 의약품 정보 테이블
CREATE TABLE IF NOT EXISTS medications (
    med_id INTEGER PRIMARY KEY AUTOINCREMENT,
    hadm_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    med_name TEXT,
    dosage TEXT,
    route TEXT,
    start_time DATETIME,
    end_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hadm_id) REFERENCES admissions(hadm_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- 검사 결과 테이블
CREATE TABLE IF NOT EXISTS lab_results (
    lab_id INTEGER PRIMARY KEY AUTOINCREMENT,
    hadm_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    test_name TEXT,
    result_value REAL,
    result_unit TEXT,
    result_date DATETIME,
    reference_range TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hadm_id) REFERENCES admissions(hadm_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_patients_gender ON patients(gender);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_time ON admissions(admittime);
CREATE INDEX IF NOT EXISTS idx_notes_hadm ON notes(hadm_id);
CREATE INDEX IF NOT EXISTS idx_waveforms_patient ON waveforms(patient_id);
CREATE INDEX IF NOT EXISTS idx_waveforms_type ON waveforms(signal_type);
CREATE INDEX IF NOT EXISTS idx_medications_hadm ON medications(hadm_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_hadm ON lab_results(hadm_id);
