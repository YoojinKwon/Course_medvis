#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/kyj/Documents/2026-1/MedVis/backend-workshop-main/flask-app')

# Import and test the data loading
from app import scan_mimic_data, patients

print("🧪 백엔드 테스트 시작...")
print("📂 MIMIC-IV 데이터 스캔 중...")

scan_mimic_data()

print(f"\n✅ 로드된 환자 수: {len(patients)}")

if patients:
    print("\n📊 환자 정보:")
    for idx, patient in enumerate(patients):
        print(f"\n  {idx+1}. 환자 ID: {patient['patient_id']}")
        print(f"     검사 수: {patient['exam_count']}")
        for exam in patient['exams']:
            print(f"     - 검사 {exam['exam_id']}: {exam['channels']}")
else:
    print("⚠️  환자 데이터가 없습니다.")
