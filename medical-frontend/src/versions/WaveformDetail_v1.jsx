/**
 * MedVis Frontend - WaveformDetail Component v1
 * 
 * 기능:
 * - 파형 데이터 시각화 (6개 채널)
 * - 채널 선택 및 전환
 * - 유사한 환자 Top 5 표시
 * - 구간별 유사도 비교 (1초 단위)
 * - 타임라인 기반 시각화
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import './WaveformDetail.css';

export const WaveformDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [waveformData, setWaveformData] = useState(null);
  const [similarWaveforms, setSimilarWaveforms] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('II');
  const [selectedSimilar, setSelectedSimilar] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5001/api';

  // 파형 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 기준 환자의 파형 데이터
        const waveformRes = await fetch(`${API_BASE}/waveforms/${patientId}`);
        if (!waveformRes.ok) throw new Error('파형 데이터를 가져올 수 없습니다.');
        const waveformJson = await waveformRes.json();
        setWaveformData(waveformJson);

        // 유사한 파형 데이터
        const similarRes = await fetch(`${API_BASE}/waveforms/${patientId}/similar`);
        if (!similarRes.ok) throw new Error('유사 파형을 가져올 수 없습니다.');
        const similarJson = await similarRes.json();
        setSimilarWaveforms(similarJson.similar_waveforms);
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  // 유사 파형 비교 데이터 가져오기
  useEffect(() => {
    if (selectedSimilar) {
      const fetchComparison = async () => {
        try {
          const res = await fetch(
            `${API_BASE}/waveforms/${patientId}/compare/${selectedSimilar.patient_id}`
          );
          if (res.ok) {
            const json = await res.json();
            setComparisonData(json);
          }
        } catch (err) {
          console.error('비교 데이터 가져오기 실패:', err);
        }
      };

      fetchComparison();
    }
  }, [selectedSimilar, patientId]);

  // 차트 데이터 준비
  const prepareChartData = () => {
    if (!waveformData) return [];
    
    const t = waveformData.t;
    const channels = waveformData.channels;
    const data = t.map((time, idx) => ({
      time: time.toFixed(2),
      [selectedChannel]: channels[selectedChannel]?.[idx] || 0,
    }));

    return data;
  };

  // 유사도에 따른 색상 선택
  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.8) return '#4CAF50'; // 초록 - 매우 유사
    if (similarity >= 0.6) return '#8BC34A'; // 밝은 초록
    if (similarity >= 0.4) return '#FFC107'; // 노랑
    if (similarity >= 0.2) return '#FF9800'; // 주황
    return '#F44336'; // 빨강 - 유사도 낮음
  };

  // 하이라이트된 구간 표시
  const getHighlightedRegions = () => {
    if (!comparisonData || !comparisonData.segment_similarities) {
      return [];
    }

    return comparisonData.segment_similarities.map((segment) => ({
      time_start: parseFloat(segment.time_start),
      time_end: parseFloat(segment.time_end),
      similarity: segment.similarity,
    }));
  };

  if (loading) {
    return (
      <div className="waveform-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="waveform-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const chartData = prepareChartData();
  const highlights = getHighlightedRegions();

  return (
    <div className="waveform-container">
      <div className="waveform-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 돌아가기
        </button>
        <div className="header-title">
          <h1>파형 분석 및 유사도 비교</h1>
          <p>환자 ID: {patientId}</p>
        </div>
      </div>

      <div className="waveform-main">
        <div className="main-chart-section">
          <div className="chart-header">
            <h2>기준 환자 파형</h2>
            <div className="channel-selector">
              {['II', 'V', 'aVR', 'ABP', 'Pleth', 'Resp'].map((ch) => (
                <button
                  key={ch}
                  className={`channel-btn ${selectedChannel === ch ? 'active' : ''}`}
                  onClick={() => setSelectedChannel(ch)}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={selectedChannel}
                  stroke="#2196F3"
                  dot={false}
                  strokeWidth={2}
                />
                {/* 하이라이트된 구간 표시 */}
                {highlights.map((highlight, idx) => (
                  <ReferenceDot
                    key={idx}
                    x={chartData[Math.min(highlight.position, chartData.length - 1)]?.time}
                    r={6}
                    fill="#FF9800"
                    opacity={0.7}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="similar-waveforms-section">
          <h2>유사한 파형 Top 5</h2>
          <div className="similar-list">
            {similarWaveforms.length === 0 ? (
              <p className="empty">유사한 파형이 없습니다.</p>
            ) : (
              similarWaveforms.map((similar, idx) => (
                <div
                  key={idx}
                  className={`similar-item ${selectedSimilar?.patient_id === similar.patient_id ? 'active' : ''}`}
                  onClick={() => setSelectedSimilar(similar)}
                >
                  <div className="rank-badge">{similar.rank}</div>
                  <div className="similar-info">
                    <h4>{similar.patient_name}</h4>
                    <p className="patient-details">
                      {similar.patient_age}세 · {similar.patient_department}
                    </p>
                  </div>
                  <div className="similarity-score">
                    <span className="score-value">
                      {(similar.similarity * 100).toFixed(1)}%
                    </span>
                    <span className="score-label">유사도</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedSimilar && comparisonData && (
            <div className="comparison-info">
              <h3>📊 구간별 유사도 분석</h3>
              {comparisonData.segment_similarities && comparisonData.segment_similarities.length > 0 ? (
                <div className="segments">
                  <div className="overall-info">
                    <span className="label">전체 유사도:</span>
                    <span className="value">
                      {(comparisonData.overall_similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <p className="segment-title">
                    시간대별 유사도 분포 (1초 단위)
                  </p>
                  
                  <div className="timeline-view">
                    {comparisonData.segment_similarities.map((segment, idx) => (
                      <div
                        key={idx}
                        className="timeline-bar"
                        title={`${segment.time_start}-${segment.time_end}초: ${(segment.similarity * 100).toFixed(1)}%`}
                        style={{
                          backgroundColor: getSimilarityColor(segment.similarity),
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="segment-details">
                    <p className="detail-title">유사도가 높은 구간 TOP 3:</p>
                    {comparisonData.high_similarity_segments && comparisonData.high_similarity_segments.map((segment, idx) => (
                      <div key={idx} className="segment-item-detail">
                        <span className="rank-num">{idx + 1}</span>
                        <div className="segment-info-box">
                          <span className="segment-time">
                            {segment.time_start}-{segment.time_end}초
                          </span>
                          <div className="segment-bar-detail">
                            <div
                              className="segment-fill-detail"
                              style={{
                                width: `${Math.min(segment.similarity * 100, 100)}%`,
                                backgroundColor: getSimilarityColor(segment.similarity),
                              }}
                            ></div>
                          </div>
                        </div>
                        <span className="segment-value-detail">
                          {(segment.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-segments">구간 비교 데이터가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
