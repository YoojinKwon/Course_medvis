import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './PatientCard.css';

export const PatientCard = ({ patient, onRemove }) => {
  const navigate = useNavigate();
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

  // 시뮬레이션: 시간별 심박수 데이터
  const generateHeartRateData = () => {
    const data = [];
    const baseHR = patient.vitals.heart_rate;
    for (let i = 0; i < 10; i++) {
      data.push({
        time: i,
        heartRate: baseHR + Math.random() * 20 - 10,
      });
    }
    return data;
  };

  const chartData = generateHeartRateData();
  const riskColor = getRiskColor(patient.risk_score);

  return (
    <div 
      className="patient-card" 
      style={{ borderLeftColor: riskColor }}
      onClick={() => navigate(`/patient/${patient.id}/waveform`)}
      role="button"
      tabIndex={0}
    >
      <div className="card-header">
        <div className="patient-info">
          <h3>{patient.name}</h3>
          <div className="patient-details">
            <span className="detail">나이: {patient.age}세</span>
            <span className="detail">{patient.department}</span>
          </div>
        </div>
        <div
          className="risk-badge"
          style={{ backgroundColor: riskColor }}
        >
          {getRiskLabel(patient.risk_score)}
        </div>
      </div>

      <div className="vitals-grid">
        <div className="vital-item">
          <span className="vital-label">심박수</span>
          <span className="vital-value">{patient.vitals.heart_rate} bpm</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">산소 포화도</span>
          <span className="vital-value">{patient.vitals.oxygen_saturation}%</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">수축기 혈압</span>
          <span className="vital-value">{patient.vitals.systolic} mmHg</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">이완기 혈압</span>
          <span className="vital-value">{patient.vitals.diastolic} mmHg</span>
        </div>
        <div className="vital-item">
          <span className="vital-label">체온</span>
          <span className="vital-value">{patient.vitals.temperature}°C</span>
        </div>
      </div>

      <div className="chart-container">
        <h4>심박수 변화</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[40, 140]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="heartRate"
              stroke={riskColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {patient.notes && (
        <div className="notes">
          <strong>비고:</strong> {patient.notes}
        </div>
      )}

      <div className="medical-info">
        <div className="medical-section">
          <h4>📋 입원 사유</h4>
          <p>{patient.admission_reason}</p>
        </div>
        <div className="medical-section">
          <h4>🏥 시술 내역</h4>
          <ul className="procedures-list">
            {patient.procedures && patient.procedures.map((proc, idx) => (
              <li key={idx}>{proc}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-footer">
        <span className="timestamp">
          입원시간: {new Date(patient.admitted_at).toLocaleString('ko-KR')}
        </span>
        <button className="btn-remove" onClick={() => onRemove(patient.id)}>
          제거
        </button>
      </div>
    </div>
  );
};
