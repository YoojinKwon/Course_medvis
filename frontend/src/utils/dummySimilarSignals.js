// 더미 유사 생체신호 데이터
export const generateDummySimilarSignals = (currentPatientId) => {
  const patients = ['10014354', '10019003', '10020306', '10039708', '10079700', '10082591'];
  const reasons = ['급성 심근경색', '심방세동', '심실 빈맥', '저혈압', '흉통', '호흡곤란', '부정맥'];
  const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];

  return [
    {
      id: 1,
      patient_id: patients[1],
      exam_id: '81932401',
      similarity_score: 0.94,
      risk_level: 'HIGH',
      highlight_region: {
        start: 0.15,
        end: 0.4,
        description: '0.15-0.40초: 急상승 패턴 일치'
      },
      admission_reason: '급성 심근경색',
      admission_date: '2024-05-10',
      discharge_date: '2024-05-25',
      note: '응급 경피적 관상동맥중재술(PCI) 시행. 좌전하행지 협착 90% 이상.'
    },
    {
      id: 2,
      patient_id: patients[2],
      exam_id: '81934892',
      similarity_score: 0.89,
      risk_level: 'HIGH',
      highlight_region: {
        start: 0.3,
        end: 0.55,
        description: '0.30-0.55초: 주기적 스파이크'
      },
      admission_reason: '심방세동',
      admission_date: '2024-04-28',
      discharge_date: '2024-05-08',
      note: '심실 빈맥 에피소드 3회 기록. 항부정맥제 투약 중.'
    },
    {
      id: 3,
      patient_id: patients[3],
      exam_id: '81938231',
      similarity_score: 0.87,
      risk_level: 'MEDIUM',
      highlight_region: {
        start: 0.2,
        end: 0.5,
        description: '0.20-0.50초: 진동 패턴'
      },
      admission_reason: '흉통',
      admission_date: '2024-06-01',
      discharge_date: '2024-06-05',
      note: '심전도 상 ST분절 상승 관찰. 상태 호전 중.'
    },
    {
      id: 4,
      patient_id: patients[4],
      exam_id: '81932104',
      similarity_score: 0.82,
      risk_level: 'MEDIUM',
      highlight_region: {
        start: 0.25,
        end: 0.45,
        description: '0.25-0.45초: 파형 유사'
      },
      admission_reason: '호흡곤란',
      admission_date: '2024-05-15',
      discharge_date: '2024-05-20',
      note: '뉴욕 심장협회 기능분류 III. 이뇨제 치료 진행 중.'
    },
    {
      id: 5,
      patient_id: patients[5],
      exam_id: '81936451',
      similarity_score: 0.78,
      risk_level: 'LOW',
      highlight_region: {
        start: 0.1,
        end: 0.35,
        description: '0.10-0.35초: 초기 상승 구간'
      },
      admission_reason: '부정맥',
      admission_date: '2024-06-02',
      discharge_date: '2024-06-07',
      note: '일시적 부정맥으로 모니터링 중. 약물 치료 반응 좋음.'
    },
    {
      id: 6,
      patient_id: patients[0],
      exam_id: '81937802',
      similarity_score: 0.75,
      risk_level: 'LOW',
      highlight_region: {
        start: 0.35,
        end: 0.6,
        description: '0.35-0.60초: 후기 변화'
      },
      admission_reason: '건강검진',
      admission_date: '2024-05-20',
      discharge_date: '2024-05-21',
      note: '정기 검진. 일반적인 변이. 이상 소견 없음.'
    }
  ];
};
