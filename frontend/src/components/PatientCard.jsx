import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './PatientCard.css';

export const PatientCard = ({ patient, onRemove }) => {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5002/api';

  // 위험도에 따른 색상 결정
  const getRiskColor = (riskScore) => {
    switch (riskScore) {
      case 1:
        return '#4CAF50'; // GREEN - LOW
      case 2:
        return '#FFC107'; // YELLOW - MEDIUM
      case 3:
        return '#FF9800'; // ORANGE - HIGH
      case 4:
        return '#F44336'; // RED - CRITICAL
      default:
        return '#9E9E9E'; // GRAY
    }
  };

  const getRiskLabel = (riskScore) => {
    const labels = { 1: '낮음', 2: '중간', 3: '높음', 4: '위험' };
    return labels[riskScore] || '알 수 없음';
  };

  // 실제 HR과 SpO2 데이터 로드
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        
        // 첫 번째 검사 사용
        if (!patient.exams || patient.exams.length === 0) {
          throw new Error('검사 데이터가 없습니다.');
        }

        const firstExam = patient.exams[0];
        const { patient_id, exam_id } = patient;

        // HR과 SpO2가 있는지 확인
        const hasHR = firstExam.channels.includes('HR');
        const hasSpO2 = firstExam.channels.includes('SpO2');

        if (!hasHR || !hasSpO2) {
          // HR/SpO2가 없으면 첫 번째 사용 가능한 채널 사용
          if (firstExam.channels.length === 0) {
            throw new Error('사용 가능한 채널이 없습니다.');
          }
          
          const channel = firstExam.channels[0];
          try {
            const response = await fetch(`${API_BASE}/waveforms/${patient_id}/${exam_id}/${channel}`);
            if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');
            
            const data = await response.json();
            const converted = data.t.map((time, idx) => ({
              time: parseFloat(time.toFixed(2)),
              HR: data.value[idx] || 0,
              SpO2: 0, // 대체 데이터
            }));
            
            setChartData(converted);
            setError(null);
          } catch (err) {
            throw new Error(`채널 ${channel} 로드 실패: ${err.message}`);
          }
        } else {
          // HR과 SpO2가 모두 있으면 동시 로드
          const [responseHR, responseSpO2] = await Promise.all([
            fetch(`${API_BASE}/waveforms/${patient_id}/${exam_id}/HR`),
            fetch(`${API_BASE}/waveforms/${patient_id}/${exam_id}/SpO2`)
          ]);

          if (!responseHR.ok || !responseSpO2.ok) {
            throw new Error('데이터를 불러올 수 없습니다.');
          }

          const dataHR = await responseHR.json();
          const dataSpO2 = await responseSpO2.json();

          // 데이터 매칭 및 차트 데이터 생성
          const combined = dataHR.t.map((time, idx) => ({
            time: parseFloat(time.toFixed(2)),
            HR: dataHR.value[idx] || 0,
            SpO2: dataSpO2.value[idx] || 0,
          }));

          setChartData(combined);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
        // 폴백: 빈 차트
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [patient, API_BASE]);

  const riskColor = getRiskColor(patient.risk_score);

  return (
    <div 
      className="patient-card" 
      style={{ borderLeftColor: riskColor }}
      onClick={() => navigate(`/patient/${patient.patient_id}/exam/${patient.exams?.[0]?.exam_id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="card-header">
        <div className="patient-info">
          <h3>환자 {patient.patient_id}</h3>
          <div className="patient-details">
            <span className="detail">검사 ID: {patient.exams?.[0]?.exam_id}</span>
            <span className="detail">총 {patient.exam_count}개 검사</span>
          </div>
        </div>
        <div
          className="risk-badge"
          style={{ backgroundColor: riskColor }}
        >
          입원
        </div>
      </div>

      <div className="vitals-grid">
        <div className="vital-item">
          <span className="vital-label">입원 시각</span>
          <span className="vital-value">
            {new Date(patient.admitted_at).toLocaleString('ko-KR').split(' ')[0]}
          </span>
        </div>
        <div className="vital-item">
          <span className="vital-label">검사 채널</span>
          <span className="vital-value">{patient.exams?.[0]?.channels?.length || 0}개</span>
        </div>
      </div>

      <div className="chart-container">
        <h4>심박수(HR) & 산소포화도(SpO2)</h4>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>로드 중...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
            {error}
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" width={30} />
              {/* 왼쪽 Y축: HR */}
              <YAxis
                yAxisId="left"
                domain={[0, 200]}
                width={40}
              />
              {/* 오른쪽 Y축: SpO2 */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[80, 100]}
                width={40}
              />
              <Tooltip
                formatter={(value) => value.toFixed(1)}
                labelFormatter={(value) => `${value.toFixed(2)}초`}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {/* HR 라인 (왼쪽 Y축) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="HR"
                stroke="#ff7300"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="HR (bpm)"
              />
              {/* SpO2 라인 (오른쪽 Y축) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="SpO2"
                stroke="#00c49f"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="SpO2 (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>데이터 없음</div>
        )}
      </div>

      <div className="card-footer">
        <span className="timestamp">
          MIMIC-IV 데이터
        </span>
        <button className="btn-remove" onClick={() => onRemove(patient.patient_id)}>
          제거
        </button>
      </div>
    </div>
  );
};
