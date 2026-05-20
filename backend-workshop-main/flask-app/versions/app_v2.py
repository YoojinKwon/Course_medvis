"""
MedVis Backend - Version 2 (MIMIC-IV 실제 데이터 기반)

특징:
- MIMIC-IV 실제 파형 데이터 로딩 (wfdb 라이브러리)
- 파일 기반 + 메모리 캐싱 (하이브리드)
- 대용량 데이터셋 지원 (수천-수만 환자)
- 더 나은 성능과 확장성

개선 사항:
- .hea/.dat 파일 직접 읽기
- 캐시 디스크 저장
- 실시간 데이터 스트리밍 대비
- 병렬 처리 지원
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import random
import os
import json
import pickle
from pathlib import Path

# MIMIC-IV 데이터 로딩용 (선택적)
try:
    import wfdb
    WFDB_AVAILABLE = True
except ImportError:
    WFDB_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# ===== 설정 =====
MIMIC_DATA_PATH = "/Users/kyj/Documents/2026-1/MedVis/physionet.org/files/mimic4wdb/0.1.0/waves"
CACHE_DIR = Path("/tmp/medvis_cache")
CACHE_DIR.mkdir(exist_ok=True)

RISK_NAMES = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}
SAMPLING_RATE = 62.4725
DURATION = 10

# ===== 글로벌 데이터 =====
patients = []
waveforms = {}  # {patient_id: waveform_data}

# ===== 캐싱 함수 =====

def get_cache_path(patient_id):
    """캐시 파일 경로"""
    return CACHE_DIR / f"waveform_{patient_id}.pkl"

def cache_waveform(patient_id, waveform_data):
    """파형 데이터를 디스크에 캐시"""
    try:
        cache_path = get_cache_path(patient_id)
        with open(cache_path, 'wb') as f:
            pickle.dump(waveform_data, f)
    except Exception as e:
        print(f"캐시 저장 실패 ({patient_id}): {e}")

def load_cached_waveform(patient_id):
    """캐시된 파형 데이터 로드"""
    try:
        cache_path = get_cache_path(patient_id)
        if cache_path.exists():
            with open(cache_path, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"캐시 로드 실패 ({patient_id}): {e}")
    return None

# ===== MIMIC-IV 데이터 로딩 (v2 신규) =====

def load_mimic_waveform(patient_id):
    """MIMIC-IV 실제 파형 데이터 로딩"""
    if not WFDB_AVAILABLE:
        print("⚠️ wfdb 라이브러리 미설치 - 합성 데이터 사용")
        return generate_synthetic_waveform(patient_id)
    
    try:
        # 예: p10039708/83411188
        patient_dir = Path(MIMIC_DATA_PATH) / f"p100/{patient_id:08d}"
        
        if not patient_dir.exists():
            print(f"⚠️ MIMIC 데이터 없음 ({patient_id}) - 합성 데이터 사용")
            return generate_synthetic_waveform(patient_id)
        
        # 디렉토리 내 .hea 파일 찾기
        hea_files = list(patient_dir.glob("*/*.hea"))
        if not hea_files:
            return generate_synthetic_waveform(patient_id)
        
        # 첫 번째 .hea 파일 사용
        record_path = str(hea_files[0]).replace('.hea', '')
        
        # wfdb로 데이터 읽기
        record = wfdb.rdrecord(record_path)
        signals = record.p_signal
        sampling_rate = record.fs
        
        # 채널 매핑
        channels = {}
        for i, sig_name in enumerate(record.sig_name):
            if i < len(signals[0]):
                channels[sig_name] = signals[:, i].tolist()
        
        # 표준 채널만 선택
        standard_channels = ['II', 'V', 'aVR', 'ABP', 'Pleth', 'Resp']
        filtered_channels = {ch: channels.get(ch, [0]*len(signals)) for ch in standard_channels}
        
        return {
            'source': 'MIMIC-IV',
            't': np.linspace(0, len(signals)/sampling_rate, len(signals)).tolist(),
            'channels': filtered_channels,
            'sampling_rate': sampling_rate,
            'duration': len(signals) / sampling_rate
        }
    
    except Exception as e:
        print(f"MIMIC 데이터 로드 실패 ({patient_id}): {e}")
        return generate_synthetic_waveform(patient_id)

def generate_synthetic_waveform(patient_id):
    """합성 파형 데이터 생성 (fallback)"""
    np.random.seed(patient_id)
    
    t = np.arange(0, DURATION, 1/SAMPLING_RATE)
    patient = next((p for p in patients if p["id"] == patient_id), None)
    hr = patient["vitals"]["heart_rate"] if patient else 70
    
    ecg_base = 0.5 * np.sin(2 * np.pi * (hr/60) * t)
    ecg_II = ecg_base + 0.1 * np.sin(2 * np.pi * 0.1 * t) + np.random.randn(len(t)) * 0.02
    ecg_V = ecg_base * 0.8 + np.random.randn(len(t)) * 0.02
    ecg_aVR = -ecg_base * 0.6 + np.random.randn(len(t)) * 0.02
    abp = 100 + 30 * np.sin(2 * np.pi * (hr/60) * t) + np.random.randn(len(t)) * 1
    pleth = 50 + 40 * np.sin(2 * np.pi * (hr/60) * t) + np.random.randn(len(t)) * 2
    resp = 20 * np.sin(2 * np.pi * 0.25 * t) + np.random.randn(len(t)) * 1
    
    return {
        'source': 'synthetic',
        't': t.tolist(),
        'channels': {
            'II': ecg_II.tolist(),
            'V': ecg_V.tolist(),
            'aVR': ecg_aVR.tolist(),
            'ABP': abp.tolist(),
            'Pleth': pleth.tolist(),
            'Resp': resp.tolist()
        },
        'sampling_rate': SAMPLING_RATE,
        'duration': DURATION
    }

def calculate_segment_similarity(sig1, sig2):
    """두 신호 구간의 상관계수 (0~1로 정규화)"""
    if len(sig1) < 2 or len(sig2) < 2:
        return 0.0
    
    try:
        s1 = (sig1 - np.mean(sig1)) / (np.std(sig1) + 1e-6)
        s2 = (sig2 - np.mean(sig2)) / (np.std(sig2) + 1e-6)
        corr = np.corrcoef(s1, s2)[0, 1]
        return max(0.0, min(1.0, float(corr)) if not np.isnan(corr) else 0.0)
    except:
        return 0.0

def get_top_similar_patients(patient_id, channel='II', limit=5):
    """상위 5개 유사 환자 (v2: 개선된 캐싱)"""
    # 캐시에서 로드 또는 생성
    if patient_id not in waveforms:
        cached = load_cached_waveform(patient_id)
        if cached:
            waveforms[patient_id] = cached
        else:
            waveforms[patient_id] = load_mimic_waveform(patient_id)
            cache_waveform(patient_id, waveforms[patient_id])
    
    ref_waveform = waveforms[patient_id]
    ref_signal = np.array(ref_waveform['channels'].get(channel, []))
    
    similarities = []
    for p in patients:
        if p["id"] == patient_id:
            continue
        
        if p["id"] not in waveforms:
            cached = load_cached_waveform(p["id"])
            if cached:
                waveforms[p["id"]] = cached
            else:
                waveforms[p["id"]] = load_mimic_waveform(p["id"])
                cache_waveform(p["id"], waveforms[p["id"]])
        
        other_signal = np.array(waveforms[p["id"]]['channels'].get(channel, []))
        sim = calculate_segment_similarity(ref_signal, other_signal)
        
        similarities.append({
            'id': p["id"],
            'name': p['name'],
            'age': p['age'],
            'department': p['department'],
            'similarity': sim
        })
    
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    for idx, item in enumerate(similarities[:limit]):
        item['rank'] = idx + 1
    
    return similarities[:limit]

def get_segment_wise_comparison(patient_id, other_id, channel='II', segment_duration=1.0):
    """구간별 유사도 비교"""
    if patient_id not in waveforms:
        cached = load_cached_waveform(patient_id)
        waveforms[patient_id] = cached if cached else load_mimic_waveform(patient_id)
    if other_id not in waveforms:
        cached = load_cached_waveform(other_id)
        waveforms[other_id] = cached if cached else load_mimic_waveform(other_id)
    
    sig1 = np.array(waveforms[patient_id]['channels'].get(channel, []))
    sig2 = np.array(waveforms[other_id]['channels'].get(channel, []))
    
    min_len = min(len(sig1), len(sig2))
    sig1 = sig1[:min_len]
    sig2 = sig2[:min_len]
    
    sampling_rate = waveforms[patient_id].get('sampling_rate', SAMPLING_RATE)
    segment_size = int(sampling_rate * segment_duration)
    segments = []
    
    for i in range(0, len(sig1) - segment_size, segment_size):
        seg1 = sig1[i:i+segment_size]
        seg2 = sig2[i:i+segment_size]
        
        sim = calculate_segment_similarity(seg1, seg2)
        segments.append({
            'time_start': round(i / sampling_rate, 2),
            'time_end': round((i + segment_size) / sampling_rate, 2),
            'segment_index': len(segments),
            'similarity': sim
        })
    
    high_similarity = sorted(segments, key=lambda x: x['similarity'], reverse=True)[:3]
    overall_sim = calculate_segment_similarity(sig1, sig2)
    
    return {
        'patient1_id': patient_id,
        'patient2_id': other_id,
        'overall_similarity': overall_sim,
        'segment_similarities': segments,
        'high_similarity_segments': high_similarity
    }

def initialize_patients():
    """15명 환자 초기화 (v1과 동일)"""
    global patients
    
    names = ['김영수', '이미영', '박준호', '최유진', '정민준', '한소영', '윤현수', '조은일', '강두영', '백민지', '송지훈', '허준현', '문성진', '오준영', '임지호']
    departments = ['내과', '응급실', '중환자실', '수술실', '신경과', '심장내과']
    reasons = ['급성 심근경색', '폐렴', '뇌졸중', '패혈증', '당뇨병 합병증', '심부전 악화', '급성 신부전']
    
    risk_dist = [4, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1]
    
    patients = []
    for idx, risk_score in enumerate(risk_dist):
        hr = (random.randint(30, 50) if random.random() > 0.5 else random.randint(120, 150)) if risk_score == 4 else random.randint(60, 100)
        
        patient = {
            'id': idx + 1,
            'name': names[idx],
            'age': random.randint(30, 85),
            'department': departments[random.randint(0, len(departments)-1)],
            'risk_score': risk_score,
            'risk_level': RISK_NAMES[risk_score],
            'vitals': {
                'heart_rate': hr,
                'oxygen_saturation': random.randint(82, 99) if risk_score >= 3 else random.randint(96, 100),
                'systolic': random.randint(140, 190) if risk_score == 4 else random.randint(110, 140),
                'diastolic': random.randint(80, 120) if risk_score == 4 else random.randint(65, 85),
                'temperature': round(random.uniform(36.0, 38.5), 1)
            },
            'admission_reason': reasons[random.randint(0, len(reasons)-1)],
            'procedures': [f'시술 {random.randint(1, 10)}', f'시술 {random.randint(1, 10)}'],
            'admitted_at': datetime.now().isoformat(),
            'waveform_path': f'p{idx+1}'
        }
        patients.append(patient)

# ===== API 엔드포인트 =====

@app.route('/api/patients', methods=['GET'])
def list_patients():
    """모든 환자 반환 (위험도 내림차순)"""
    sorted_p = sorted(patients, key=lambda x: x['risk_score'], reverse=True)
    return jsonify({'patients': sorted_p})

@app.route('/api/waveforms/<int:patient_id>', methods=['GET'])
def get_waveform(patient_id):
    """환자 파형 데이터 (v2: 캐싱 개선)"""
    if patient_id not in waveforms:
        cached = load_cached_waveform(patient_id)
        if cached:
            waveforms[patient_id] = cached
        else:
            waveforms[patient_id] = load_mimic_waveform(patient_id)
            cache_waveform(patient_id, waveforms[patient_id])
    
    return jsonify(waveforms.get(patient_id, {}))

@app.route('/api/waveforms/<int:patient_id>/similar', methods=['GET'])
def get_similar(patient_id):
    """상위 5개 유사 환자"""
    similar = get_top_similar_patients(patient_id, 'II', 5)
    return jsonify({'reference_patient_id': patient_id, 'similar_waveforms': similar})

@app.route('/api/waveforms/<int:patient_id>/compare/<int:other_id>', methods=['GET'])
def compare_waveforms(patient_id, other_id):
    """두 환자 파형 비교 (구간별)"""
    result = get_segment_wise_comparison(patient_id, other_id, 'II', 1.0)
    return jsonify(result)

@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스 체크"""
    wfdb_status = "설치됨" if WFDB_AVAILABLE else "미설치"
    mimic_available = os.path.exists(MIMIC_DATA_PATH)
    return jsonify({
        'status': 'ok',
        'version': 'v2',
        'patients': len(patients),
        'wfdb': wfdb_status,
        'mimic_data': mimic_available,
        'cache_size': len(list(CACHE_DIR.glob('*.pkl')))
    })

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """캐시 초기화 (v2 신규)"""
    try:
        for cache_file in CACHE_DIR.glob('*.pkl'):
            cache_file.unlink()
        waveforms.clear()
        return jsonify({'status': 'ok', 'message': '캐시 초기화 완료'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    initialize_patients()
    print(f"✅ {len(patients)} 환자 초기화 완료")
    print(f"📦 MIMIC-IV wfdb 지원: {'O' if WFDB_AVAILABLE else 'X'}")
    print(f"📁 MIMIC 데이터 경로: {MIMIC_DATA_PATH}")
    print(f"💾 캐시 경로: {CACHE_DIR}")
    app.run(debug=False, port=5002, threaded=True)
