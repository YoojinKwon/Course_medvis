import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './WaveformDetail.css';

export const WaveformDetail = () => {
  const { patientId, examId } = useParams();
  const navigate = useNavigate();
  const [waveformDataHR, setWaveformDataHR] = useState(null);
  const [waveformDataSpO2, setWaveformDataSpO2] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasHRSpO2, setHasHRSpO2] = useState(false);

  const API_BASE = 'http://localhost:5002/api';

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
        
        // HR과 SpO2가 모두 있는지 확인
        const hasHR = exam.channels.includes('HR');
        const hasSpO2 = exam.channels.includes('SpO2');
        setHasHRSpO2(hasHR && hasSpO2);
        
        // 초기 채널 선택
        if (hasHR && hasSpO2) {
          setSelectedChannel('HR+SpO2'); // 특수 채널 표시기
        } else {
          setSelectedChannel(exam.channels[0]);
        }
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamInfo();
  }, [patientId, examId]);

  // HR과 SpO2 데이터 동시 로드 (있으면)
  useEffect(() => {
    if (!hasHRSpO2) return;

    const fetchBothChannels = async () => {
      try {
        setLoading(true);
        
        // HR과 SpO2가 실제로 있는지 확인
        const [responseHR, responseSpO2] = await Promise.all([
          fetch(`${API_BASE}/waveforms/${patientId}/${examId}/HR`),
          fetch(`${API_BASE}/waveforms/${patientId}/${examId}/SpO2`)
        ]);
        
        // 한쪽이라도 실패하면 fallback을 사용
        if (responseHR.ok && responseSpO2.ok) {
          const dataHR = await responseHR.json();
          const dataSpO2 = await responseSpO2.json();
          
          setWaveformDataHR(dataHR);
          setWaveformDataSpO2(dataSpO2);
          setError(null);
        } else {
          // HR/SpO2 중 하나라도 없으면 첫 번째 채널 사용
          if (availableChannels.length > 0) {
            const fallbackChannel = availableChannels[0];
            const response = await fetch(`${API_BASE}/waveforms/${patientId}/${examId}/${fallbackChannel}`);
            if (!response.ok) {
              throw new Error('파형 데이터를 불러올 수 없습니다.');
            }
            const data = await response.json();
            setWaveformDataHR(data);
            setWaveformDataSpO2(null);
            setError(null);
          }
        }
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBothChannels();
  }, [patientId, examId, hasHRSpO2, availableChannels]);

  // 다른 채널 데이터 로드
  useEffect(() => {
    if (!selectedChannel || selectedChannel === 'HR+SpO2') return;

    const fetchWaveform = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/waveforms/${patientId}/${examId}/${selectedChannel}`
        );
        if (!response.ok) throw new Error('파형 데이터를 가져올 수 없습니다.');
        const data = await response.json();
        setWaveformDataHR(data);
        setWaveformDataSpO2(null);
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

  // 이중 Y축 차트용 데이터 준비 (HR + SpO2)
  const prepareChartDataDualAxis = () => {
    if (!waveformDataHR || !waveformDataSpO2) return [];

    const tHR = waveformDataHR.t;
    const valueHR = waveformDataHR.value;
    const valueSpO2 = waveformDataSpO2.value;

    // HR과 SpO2의 시간축이 같다고 가정하고 매칭
    return tHR.map((time, idx) => ({
      time: parseFloat(time.toFixed(2)),
      HR: valueHR[idx] || 0,
      SpO2: valueSpO2[idx] || 0,
    }));
  };

  // 단축 Y축 차트용 데이터 준비
  const prepareChartData = () => {
    if (!waveformDataHR) return [];

    const t = waveformDataHR.t;
    const value = waveformDataHR.value;

    return t.map((time, idx) => ({
      time: parseFloat(time.toFixed(2)),
      value: value[idx] || 0,
    }));
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading && !waveformDataHR) {
    return (
      <div className="waveform-container">
        <div className="loading-state">
          <p>📊 파형 데이터를 로드 중입니다...</p>
        </div>
      </div>
    );
  }

  // 표시할 차트 데이터 선택
  const chartData = selectedChannel === 'HR+SpO2' 
    ? prepareChartDataDualAxis() 
    : prepareChartData();

  return (
    <div className="waveform-container">
      {/* 상단 박스 - 헤더 */}
      <div className="section-box top-section">
        <div className="waveform-header">
          <button className="btn-back" onClick={handleBack}>
            ← 돌아가기
          </button>
          <div className="header-info">
            <h1>🏥 파형 데이터 상세</h1>
            <p>환자: {patientId} | 검사: {examId}</p>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* 중단 박스 - 채널 선택 */}
      <div className="section-box middle-section">
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
            {hasHRSpO2 && (
              <button
                className={`channel-btn ${selectedChannel === 'HR+SpO2' ? 'active' : ''}`}
                onClick={() => setSelectedChannel('HR+SpO2')}
              >
                HR + SpO2
              </button>
            )}
          </div>
        </div>

        {waveformDataHR && (
          <div className="waveform-info">
            <div className="info-item">
              <span className="label">채널:</span>
              <span className="value">
                {selectedChannel === 'HR+SpO2' ? 'HR + SpO2' : waveformDataHR.channel}
              </span>
            </div>
            <div className="info-item">
              <span className="label">샘플링 레이트:</span>
              <span className="value">{waveformDataHR.sampling_rate.toFixed(2)} Hz</span>
            </div>
            <div className="info-item">
              <span className="label">지속 시간:</span>
              <span className="value">{waveformDataHR.duration.toFixed(2)} 초</span>
            </div>
            <div className="info-item">
              <span className="label">단위:</span>
              <span className="value">
                {selectedChannel === 'HR+SpO2' 
                  ? 'HR: bpm, SpO2: %' 
                  : waveformDataHR.unit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 하단 박스 - 차트 */}
      {chartData.length > 0 && (
        <div className="section-box bottom-section">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              {selectedChannel === 'HR+SpO2' ? (
                // 이중 Y축 차트
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    label={{ value: '시간 (초)', position: 'insideBottomRight', offset: -5 }}
                  />
                  {/* 왼쪽 Y축: HR */}
                  <YAxis
                    yAxisId="left"
                    label={{ value: 'HR (bpm)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 200]}
                  />
                  {/* 오른쪽 Y축: SpO2 */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'SpO2 (%)', angle: 90, position: 'insideRight' }}
                    domain={[80, 100]}
                  />
                  <Tooltip
                    formatter={(value) => value.toFixed(1)}
                    labelFormatter={(value) => `${value.toFixed(2)}초`}
                  />
                  <Legend />
                  {/* HR 라인 (왼쪽 Y축) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="HR"
                    stroke="#ff7300"
                    dot={false}
                    isAnimationActive={false}
                    strokeWidth={2}
                    name="심박수 (HR)"
                  />
                  {/* SpO2 라인 (오른쪽 Y축) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="SpO2"
                    stroke="#00c49f"
                    dot={false}
                    isAnimationActive={false}
                    strokeWidth={2}
                    name="산소포화도 (SpO2)"
                  />
                </LineChart>
              ) : (
                // 단일 Y축 차트
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
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
