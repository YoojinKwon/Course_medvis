from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)

# ===== 글로벌 데이터 =====
patients = []
waveforms = {}  # {patient_id: waveform_data}

RISK_NAMES = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}
SAMPLING_RATE = 62.4725
DURATION = 10

# ===== 데이터 생성 함수 =====

def generate_waveform(patient_id):
    """파형 데이터 생성 (한 번만 생성하고 캐시)"""
    np.random.seed(patient_id)
    
    t = np.arange(0, DURATION, 1/SAMPLING_RATE)
    
    # 심박수 계산 (환자 정보에서)
    patient = next((p for p in patients if p["id"] == patient_id), None)
    hr = patient["vitals"]["heart_rate"] if patient else 70
    
    # ECG 신호 (II, V, aVR)
    ecg_base = 0.5 * np.sin(2 * np.pi * (hr/60) * t)
    ecg_II = ecg_base + 0.1 * np.sin(2 * np.pi * 0.1 * t) + np.random.randn(len(t)) * 0.02
    ecg_V = ecg_base * 0.8 + np.random.randn(len(t)) * 0.02
    ecg_aVR = -ecg_base * 0.6 + np.random.randn(len(t)) * 0.02
    
    # ABP (혈압)
    abp = 100 + 30 * np.sin(2 * np.pi * (hr/60) * t) + np.random.randn(len(t)) * 1
    
    # Pleth (맥박)
    pleth = 50 + 40 * np.sin(2 * np.pi * (hr/60) * t) + np.random.randn(len(t)) * 2
    
    # Resp (호흡)
    resp = 20 * np.sin(2 * np.pi * 0.25 * t) + np.random.randn(len(t)) * 1
    
    waveforms[patient_id] = {
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
    """상위 5개 유사 환자 빠르게 계산"""
    if patient_id not in waveforms:
        generate_waveform(patient_id)
    
    ref_waveform = waveforms[patient_id]
    ref_signal = np.array(ref_waveform['channels'][channel])
    
    similarities = []
    for p in patients:
        if p["id"] == patient_id:
            continue
        
        if p["id"] not in waveforms:
            generate_waveform(p["id"])
        
        other_signal = np.array(waveforms[p["id"]]['channels'][channel])
        
        # 빠른 유사도 계산 (전체 신호 상관계수)
        sim = calculate_segment_similarity(ref_signal, other_signal)
        similarities.append({
            'id': p["id"],
            'name': p['name'],
            'age': p['age'],
            'department': p['department'],
            'similarity': sim
        })
    
    # 상위 5개 정렬
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    for idx, item in enumerate(similarities[:limit]):
        item['rank'] = idx + 1
    
    return similarities[:limit]

def get_segment_wise_comparison(patient_id, other_id, channel='II', segment_duration=1.0):
    """구간별 유사도 비교"""
    if patient_id not in waveforms:
        generate_waveform(patient_id)
    if other_id not in waveforms:
        generate_waveform(other_id)
    
    sig1 = np.array(waveforms[patient_id]['channels'][channel])
    sig2 = np.array(waveforms[other_id]['channels'][channel])
    
    # 짧은 길이에 맞추기
    min_len = min(len(sig1), len(sig2))
    sig1 = sig1[:min_len]
    sig2 = sig2[:min_len]
    
    segment_size = int(SAMPLING_RATE * segment_duration)
    segments = []
    
    for i in range(0, len(sig1) - segment_size, segment_size):
        seg1 = sig1[i:i+segment_size]
        seg2 = sig2[i:i+segment_size]
        
        sim = calculate_segment_similarity(seg1, seg2)
        segments.append({
            'time_start': round(i / SAMPLING_RATE, 2),
            'time_end': round((i + segment_size) / SAMPLING_RATE, 2),
            'segment_index': len(segments),
            'similarity': sim
        })
    
    # 상위 3개 구간
    high_similarity = sorted(segments, key=lambda x: x['similarity'], reverse=True)[:3]
    
    # 전체 유사도
    overall_sim = calculate_segment_similarity(sig1, sig2)
    
    return {
        'patient1_id': patient_id,
        'patient2_id': other_id,
        'overall_similarity': overall_sim,
        'segment_similarities': segments,
        'high_similarity_segments': high_similarity
    }

def initialize_patients():
    """15명 환자 초기화"""
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
    
    # 파형 데이터도 미리 생성
    for p in patients:
        generate_waveform(p['id'])

# ===== API 엔드포인트 =====

@app.route('/api/patients', methods=['GET'])
def list_patients():
    """모든 환자 반환 (위험도 내림차순)"""
    sorted_p = sorted(patients, key=lambda x: x['risk_score'], reverse=True)
    return jsonify(sorted_p)

@app.route('/api/waveforms/<int:patient_id>', methods=['GET'])
def get_waveform(patient_id):
    """환자 파형 데이터"""
    if patient_id not in waveforms:
        generate_waveform(patient_id)
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
    return jsonify({'status': 'ok', 'patients': len(patients)})

if __name__ == '__main__':
    initialize_patients()
    print(f"✅ {len(patients)} 환자 초기화 완료")
    print("✅ 파형 데이터 사전 생성 완료")
    app.run(debug=False, port=5001, threaded=True)
