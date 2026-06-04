from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import random
import wfdb
import os
from pathlib import Path
import json
import gzip
import csv

app = Flask(__name__)
CORS(app)

# ===== Flask JSON 인코더 커스터마이징 =====
class NumpyEncoder(json.JSONEncoder):
    """NaN, Inf 값을 처리하는 JSON 인코더"""
    def encode(self, o):
        if isinstance(o, float):
            if np.isnan(o) or np.isinf(o):
                return 'null'
        return super().encode(o)
    
    def iterencode(self, o, _one_shot=False):
        """Infinity와 NaN을 처리하여 JSON 호환 값으로 변환"""
        for chunk in super().iterencode(o, _one_shot):
            yield chunk

app.json_encoder = NumpyEncoder

# ===== 글로벌 데이터 =====
patients = []  # Real patients from MIMIC-IV
waveforms_cache = {}  # {patient_id: {exam_id: {channel: waveform_data}}}

# MIMIC-IV 데이터 경로
MIMIC_DATA_ROOT = "/Users/kyj/Documents/2026-1/MedVis/physionet.org/files/mimic4wdb/0.1.0/waves/p100"

RISK_NAMES = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}
SAMPLING_RATE = 62.4725
DURATION = 10

# ===== MIMIC-IV 데이터 로딩 함수 =====

def extract_patient_id(folder_name):
    """폴더명 'p10014354'에서 환자 ID '10014354' 추출"""
    if folder_name.startswith('p'):
        return folder_name[1:]
    return folder_name

def scan_mimic_data():
    """
    MIMIC-IV p100 폴더 스캔하여 환자 및 검사 정보 수집
    """
    global patients
    patients = []
    
    p100_path = Path(MIMIC_DATA_ROOT)
    if not p100_path.exists():
        print(f"❌ MIMIC-IV 데이터 경로 없음: {MIMIC_DATA_ROOT}")
        return
    
    # p100 하위 모든 patient 폴더 스캔
    patient_folders = sorted([d for d in p100_path.iterdir() if d.is_dir() and d.name.startswith('p')])
    
    for patient_folder in patient_folders:
        patient_id = extract_patient_id(patient_folder.name)
        
        # 각 patient 폴더 안의 exam 폴더들 스캔
        exams = []
        for exam_folder in patient_folder.iterdir():
            if exam_folder.is_dir() and exam_folder.name.isdigit():
                exam_id = exam_folder.name
                
                # 각 exam 폴더에서 채널 정보 추출
                channels = extract_channels_from_exam(exam_folder)
                
                if channels:  # 채널이 있는 경우만 추가
                    exams.append({
                        'exam_id': exam_id,
                        'channels': channels,
                        'path': str(exam_folder)
                    })
        
        if exams:  # 검사가 있는 경우만 환자 추가
            patient = {
                'patient_id': patient_id,
                'exams': exams,
                'exam_count': len(exams),
                'admitted_at': datetime.now().isoformat()
            }
            patients.append(patient)
            print(f"✅ 환자 {patient_id}: {len(exams)}개 검사 로드됨")
    
    print(f"\n✅ 총 {len(patients)}명의 환자 데이터 로드 완료")

def extract_channels_from_exam(exam_folder):
    """
    Exam 폴더에서 첫 번째 segment 파일을 분석하여 채널 목록 추출
    MIMIC-IV는 다중 segment 포맷을 사용합니다.
    CSV.GZ 파일이 있으면 ['HR', 'SpO2'] 채널 추가
    """
    channels = []
    exam_name = exam_folder.name
    
    # CSV.GZ 파일 확인
    csv_gz_file = exam_folder / f"{exam_name}n.csv.gz"
    if csv_gz_file.exists():
        # CSV.GZ 파일이 있으면 HR과 SpO2 채널 사용
        return ['HR', 'SpO2']
    
    # segment 파일 찾기 (examid_000X.hea 형식)
    segment_files = sorted(list(exam_folder.glob(f"{exam_name}_*.hea")))
    
    if not segment_files:
        # segment 파일이 없으면 main .hea 파일 시도
        main_hea = exam_folder / f"{exam_name}.hea"
        if main_hea.exists():
            segment_files = [main_hea]
        else:
            return []
    
    # 첫 번째 segment에서 채널 정보 추출
    try:
        first_segment = segment_files[0]
        record = wfdb.rdheader(str(first_segment).replace('.hea', ''))
        
        if record.sig_name is not None:
            channels = list(record.sig_name)
        
        return channels
    except Exception as e:
        print(f"⚠️  채널 추출 실패 ({exam_folder.name}): {e}")
        return []

def load_csv_gz_data(exam_folder, channel):
    """
    CSV.GZ 파일에서 HR 또는 SpO2 데이터 로드
    """
    exam_name = exam_folder.name
    csv_gz_file = exam_folder / f"{exam_name}n.csv.gz"
    
    if not csv_gz_file.exists():
        return None
    
    try:
        # 컬럼 인덱스 정의
        CHANNEL_COLUMNS = {
            'HR': 2,      # 'HR [bpm]'
            'SpO2': 16    # 'SpO2 [%]'
        }
        
        if channel not in CHANNEL_COLUMNS:
            return None
        
        col_idx = CHANNEL_COLUMNS[channel]
        time_data = []
        value_data = []
        
        # CSV.GZ 파일 읽기
        with gzip.open(csv_gz_file, 'rt') as f:
            reader = csv.reader(f)
            headers = next(reader)  # 헤더 스킵
            
            for row in reader:
                try:
                    if len(row) > col_idx:
                        # time 값 (밀리초 -> 초로 변환)
                        time_ms = float(row[0])
                        time_sec = time_ms / 1000.0
                        
                        # 채널 값
                        value_str = row[col_idx].strip()
                        if value_str:  # 빈 값 제외
                            value = float(value_str)
                            time_data.append(time_sec)
                            value_data.append(value)
                except (ValueError, IndexError):
                    continue
        
        if not time_data:
            return None
        
        # 데이터 다운샘플링 (너무 많은 데이터 포인트 제외)
        # 최대 2000개 포인트로 제한
        if len(time_data) > 2000:
            step = len(time_data) // 2000
            time_data = time_data[::step]
            value_data = value_data[::step]
        
        # 단위 설정
        unit = 'bpm' if channel == 'HR' else '%'
        
        waveform_data = {
            't': time_data,
            'value': value_data,
            'channel': channel,
            'sampling_rate': len(time_data) / (time_data[-1] - time_data[0]) if len(time_data) > 1 and time_data[-1] > time_data[0] else 1.0,
            'duration': time_data[-1] - time_data[0] if len(time_data) > 1 else 0.0,
            'unit': unit
        }
        
        return waveform_data
        
    except Exception as e:
        print(f"⚠️  CSV.GZ 로드 실패 ({exam_name}/{channel}): {e}")
        return None

def load_waveform_data(patient_id, exam_id, channel):
    """
    MIMIC-IV 데이터에서 실제 파형 데이터 로드 (캐시 사용)
    multi-segment 포맷 지원
    각 segment는 다른 채널을 가질 수 있으므로, 요청된 채널이 있는 segment를 찾음
    HR/SpO2는 CSV.GZ 파일에서 로드
    """
    cache_key = f"{patient_id}_{exam_id}_{channel}"
    
    # 캐시에서 먼저 확인
    if cache_key in waveforms_cache:
        return waveforms_cache[cache_key]
    
    # 데이터 경로
    exam_folder = Path(MIMIC_DATA_ROOT) / f"p{patient_id}" / exam_id
    
    if not exam_folder.exists():
        return None
    
    # HR 또는 SpO2 채널이면 CSV.GZ에서 로드
    if channel in ['HR', 'SpO2']:
        waveform_data = load_csv_gz_data(exam_folder, channel)
        if waveform_data:
            waveforms_cache[cache_key] = waveform_data
        return waveform_data
    
    try:
        # 모든 segment 파일 찾기
        segment_files = sorted(list(exam_folder.glob(f"{exam_id}_*.hea")))
        
        if not segment_files:
            return None
        
        # 요청된 채널을 포함하는 segment 찾기
        target_segment = None
        target_record = None
        
        for seg_file in segment_files:
            try:
                # wfdb.rdsamp 사용 (tuple 반환: data, metadata)
                data, metadata = wfdb.rdsamp(str(seg_file).replace('.hea', ''))
                
                # 해당 segment에 데이터가 있고, 요청된 채널이 있는지 확인
                if len(data) > 0 and metadata['sig_name'] and channel in metadata['sig_name']:
                    target_segment = data
                    target_record = metadata
                    break
            except:
                continue
        
        if target_segment is None or target_record is None:
            return None
        
        # 요청한 채널 찾기
        if target_record['sig_name'] is None or channel not in target_record['sig_name']:
            return None
        
        channel_idx = target_record['sig_name'].index(channel)
        signal_data = target_segment[:, channel_idx]
        
        # 시간축 생성
        fs = target_record['fs']
        t = np.arange(len(signal_data)) / fs
        
        # 단위 정보 추출
        unit = 'mV'
        if 'units' in target_record and target_record['units']:
            if isinstance(target_record['units'], list) and len(target_record['units']) > channel_idx:
                unit = target_record['units'][channel_idx]
        
        waveform_data = {
            't': [float('nan') if np.isnan(x) or np.isinf(x) else float(x) for x in t.tolist()],
            'value': [0.0 if (np.isnan(x) or np.isinf(x)) else float(x) for x in signal_data.tolist()],
            'channel': channel,
            'sampling_rate': float(fs) if not np.isnan(fs) else 62.4725,
            'duration': float(t[-1]) if len(t) > 0 and not np.isnan(t[-1]) else 0.0,
            'unit': unit
        }
        
        # 캐시에 저장
        waveforms_cache[cache_key] = waveform_data
        
        return waveform_data
        
    except Exception as e:
        print(f"⚠️  파형 로드 실패 ({patient_id}/{exam_id}/{channel}): {e}")
        import traceback
        traceback.print_exc()
        return None




# ===== 남은 유사도 함수들 (현재 사용하지 않음) =====



# ===== API 엔드포인트 =====

@app.route('/api/patients', methods=['GET'])
def list_patients():
    """
    모든 환자 목록 반환
    각 환자별로 검사 목록 포함 (파형 데이터는 별도 요청)
    """
    return jsonify({
        'total_patients': len(patients),
        'patients': patients
    })

@app.route('/api/waveforms/<patient_id>/<exam_id>/<channel>', methods=['GET'])
def get_waveform(patient_id, exam_id, channel):
    """
    실제 파형 데이터 반환
    - patient_id: 환자 ID (p######에서 ######)
    - exam_id: 검사 ID (########)  
    - channel: 채널 이름 (예: II, V, aVR, ABP 등)
    """
    waveform_data = load_waveform_data(patient_id, exam_id, channel)
    
    if waveform_data is None:
        return jsonify({'error': f'파형 데이터를 찾을 수 없습니다: {patient_id}/{exam_id}/{channel}'}), 404
    
    return jsonify(waveform_data)

@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스 체크"""
    return jsonify({
        'status': 'ok',
        'patients': len(patients),
        'data_source': 'MIMIC-IV wfdb'
    })

if __name__ == '__main__':
    print("🚀 MedVis 백엔드 시작...")
    print("📂 MIMIC-IV 데이터 로드 중...")
    scan_mimic_data()
    
    if patients:
        print(f"✅ {len(patients)}명의 환자 데이터 로드 완료")
        print(f"✅ 검사 데이터 준비 완료")
        for p in patients[:6]:  # 모든 환자 정보 출력
            print(f"   - 환자 {p['patient_id']}: {p['exam_count']}개 검사")
            for exam in p['exams']:
                print(f"     * 검사 {exam['exam_id']}: {exam['channels']}")
    else:
        print("⚠️  환자 데이터를 로드할 수 없습니다.")
    
    app.run(debug=False, port=5002, threaded=True)

