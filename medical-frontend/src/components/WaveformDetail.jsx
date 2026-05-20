import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './WaveformDetail.css';

export const WaveformDetail = () => {
  const { patientId, examId } = useParams();
  const navigate = useNavigate();
  const [waveformData, setWaveformData] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5001/api';

  // 현재 환자-검사의 사용 가능한 채널 목록을 먼저 가져오기
  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/patients`);
        if (!response.ok) throw new Error('환자 정보를 가져올 수 없습니다.');
        const data = await response.json();

        // 현재 환자와 검사 찾기
        const patient = data.patients.find((p) => p.patient_id === patientId);
        if (!patient) throw new Error('환자를 찾을 수 없습니다.');

        const exam = patient.exams.find((e) => e.exam_id === examId);
        if (!exam) throw new Error('검사를 찾을 수 없습니다.');

        setAvailableChannels(exam.channels);
        setSelectedChannel(exam.channels[0]); // 첫 번째 채널로 초기화
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamInfo();
  }, [patientId, examId]);

  // 선택된 채널의 파형 데이터 가져오기
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchWaveform = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/waveforms/${patientId}/${examId}/${selectedChannel}`
        );
        if (!response.ok) throw new Error('파형 데이터를 가져올 수 없습니다.');
        const data = await response.json();
        setWaveformData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWaveform();
  }, [selectedChannel, patientId, examId]);

  // 차트 데이터 준비
  const prepareChartData = () => {
    if (!waveformData) return [];

    const t = waveformData.t;
    const value = waveformData.value;

    return t.map((time, idx) => ({
      time: parseFloat(time.toFixed(2)),
      value: value[idx] || 0,
    }));
  };

  const chartData = prepareChartData();

  const handleBack = () => {
    navigate('/');
  };

  if (loading && !waveformData) {
    return (
      <div className="waveform-container">
        <div className="loading-state">
          <p>📊 파형 데이터를 로드 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waveform-container">
      <div className="waveform-header">
        <button className="btn-back" onClick={handleBack}>
          ← 돌아가기
        </button>
        <div className="header-info">
          <h1>🏥 파형 데이터 상세</h1>
          <p>환자: {patientId} | 검사: {examId}</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="channel-selector">
        <label>채널 선택:</label>
        <div className="channel-buttons">
          {availableChannels.map((channel) => (
            <button
              key={channel}
              className={`channel-btn ${selectedChannel === channel ? 'active' : ''}`}
              onClick={() => setSelectedChannel(channel)}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {waveformData && (
        <div className="waveform-info">
          <div className="info-item">
            <span className="label">채널:</span>
            <span className="value">{waveformData.channel}</span>
          </div>
          <div className="info-item">
            <span className="label">샘플링 레이트:</span>
            <span className="value">{waveformData.sampling_rate.toFixed(2)} Hz</span>
          </div>
          <div className="info-item">
            <span className="label">지속 시간:</span>
            <span className="value">{waveformData.duration.toFixed(2)} 초</span>
          </div>
          <div className="info-item">
            <span className="label">단위:</span>
            <span className="value">{waveformData.unit}</span>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{ value: '시간 (초)', position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis label={{ value: selectedChannel, angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => value.toFixed(3)}
                labelFormatter={(value) => `${value.toFixed(2)}초`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#667eea"
                dot={false}
                isAnimationActive={false}
                strokeWidth={2}
                name={`${selectedChannel} 신호`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
