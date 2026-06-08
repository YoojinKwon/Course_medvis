import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SimilarSignalsList from './SimilarSignalsList';
import { mlService } from '../services/mlService';
import './PatientList.css';

const API_BASE = 'http://localhost:5002/api';

// 공통 유틸 함수: 위험도 계산
const getRiskLevelValue = (patientId) => {
  const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
  const index = parseInt(patientId) % 3;
  return riskLevels[index];
};

// 채널별 색상
const getChannelColor = (channel) => {
  if (channel === 'HR') return '#ef4444';
  if (channel === 'SpO2') return '#099981ff';
  return '#667eea';
};

// 공통 유틸 함수: 파형 데이터 변환
const convertWaveformData = (data, endIndex) => {
  if (!data?.t || !data?.value) return [];
  return data.t.slice(0, endIndex).map((time, idx) => ({
    time: parseFloat(time.toFixed(2)),
    value: data.value[idx] || 0,
  }));
};

// 환자 미리보기 카드 컴포넌트
const PatientPreviewCard = ({ patient, isSelected, onSelect, API_BASE }) => {
  const [allDataHR, setAllDataHR] = useState([]);
  const [allDataSpO2, setAllDataSpO2] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamIndex, setStreamIndex] = useState(0);

  // 환자의 위험도
  const riskLevel = getRiskLevelValue(patient.patient_id);

  const channels = patient.exams?.[0]?.channels || [];
  const examId = patient.exams?.[0]?.exam_id;

  // HR과 SpO2 동시 fetch
  useEffect(() => {
    if (!examId) return;

    const fetchBoth = async () => {
      try {
        setLoading(true);
        const fetches = channels.map(ch =>
          fetch(`${API_BASE}/waveforms/${patient.patient_id}/${examId}/${ch}`)
            .then(r => r.ok ? r.json() : null)
        );
        const results = await Promise.all(fetches);

        const parse = (data) =>
          data?.t.map((time, idx) => ({
            time: parseFloat(time.toFixed(2)),
            value: data.value[idx] ?? 0,
          })) || [];

        const hrIdx = channels.indexOf('HR');
        const spo2Idx = channels.indexOf('SpO2');
        if (hrIdx !== -1) setAllDataHR(parse(results[hrIdx]));
        if (spo2Idx !== -1) setAllDataSpO2(parse(results[spo2Idx]));
        setStreamIndex(0);
      } catch (err) {
        console.error('Waveform fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoth();
  }, [patient, API_BASE]);

  // 스트리밍 로직 - 무한 반복
  useEffect(() => {
    const maxLen = Math.max(allDataHR.length, allDataSpO2.length);
    if (maxLen === 0 || loading) return;

    const interval = setInterval(() => {
      setStreamIndex(prev => (prev + 5) % maxLen);
    }, 200);

    return () => clearInterval(interval);
  }, [allDataHR, allDataSpO2, loading]);

  // 슬라이딩 윈도우 (최근 100개) - HR/SpO2를 하나의 배열로 병합
  useEffect(() => {
    const maxLen = Math.max(allDataHR.length, allDataSpO2.length);
    if (maxLen === 0) return;

    const sliceEnd = streamIndex === 0 ? maxLen : streamIndex;
    const start = Math.max(0, sliceEnd - 100);

    const merged = [];
    for (let i = start; i < sliceEnd; i++) {
      merged.push({
        time: allDataHR[i]?.time ?? allDataSpO2[i]?.time ?? i,
        HR: allDataHR[i]?.value,
        SpO2: allDataSpO2[i]?.value,
      });
    }
    setChartData(merged);
  }, [streamIndex, allDataHR, allDataSpO2]);

  const hasData = chartData.length > 0;

  return (
    <div
      className={`patient-preview-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="patient-preview-header">
        <div className="patient-preview-name"> 👤 {patient.patient_id}</div>
      </div>

      {/* 미니 차트 */}
      <div className="mini-chart-container">
        {loading ? (
          <div className="mini-loading">Loading...</div>
        ) : !hasData ? (
          <div className="mini-empty">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 5, left: 12, bottom: 0 }} style={{ background: '#131722' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
              <XAxis dataKey="time" tick={false} domain={["dataMin", "dataMax"]} type="number" />
              <YAxis yAxisId="HR" orientation="left" tick={{ fontSize: 11, fill: getChannelColor('HR') }} width={36} />
              <YAxis yAxisId="SpO2" orientation="right" tick={{ fontSize: 11, fill: getChannelColor('SpO2') }} width={36} />
              {channels.includes('HR') && (
                <Line yAxisId="HR" type="monotone" dataKey="HR" stroke={getChannelColor('HR')} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {channels.includes('SpO2') && (
                <Line yAxisId="SpO2" type="monotone" dataKey="SpO2" stroke={getChannelColor('SpO2')} strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 위험도 배지 */}
      <div className="risk-badge-container">
        <span className={`risk-badge risk-${riskLevel.toLowerCase()}`}>
          {riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MEDIUM' ? '🟡' : '🟢'} {riskLevel}
        </span>
      </div>
    </div>
  );
};

export const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('HR');
  const [detailWaveformData, setDetailWaveformData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // 초기값: 50%
  const [isResizing, setIsResizing] = useState(false);
  const [detailStreamIndex, setDetailStreamIndex] = useState(0);
  const [similarSignals, setSimilarSignals] = useState([]);

  // 백엔드에서 환자 데이터 가져오기
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/patients`);
      if (!response.ok) throw new Error('환자 데이터를 가져올 수 없습니다.');
      const data = await response.json();
      setPatients(data.patients || []);
      
      // 첫 번째 환자와 첫 번째 검사 자동 선택
      if (data.patients?.length > 0) {
        const firstPatient = data.patients[0];
        setSelectedPatient(firstPatient);
        if (firstPatient.exams?.length > 0) {
          setSelectedExam(firstPatient.exams[0]);
          setSelectedChannel(firstPatient.exams[0].channels?.[0] || 'HR');
        }
      }
    } catch (err) {
      console.error('환자 데이터 로드 오류:', err);
      setError('환자 데이터를 불러올 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // 우측 패널용 상세 파형 데이터 가져오기
  useEffect(() => {
    if (!selectedPatient || !selectedExam || !selectedChannel) return;

    const fetchDetailWaveform = async () => {
      try {
        setDetailLoading(true);
        const response = await fetch(
          `${API_BASE}/waveforms/${selectedPatient.patient_id}/${selectedExam.exam_id}/${selectedChannel}`
        );
        if (!response.ok) throw new Error('파형 데이터를 가져올 수 없습니다.');
        setDetailWaveformData(await response.json());
        setDetailStreamIndex(0); // 스트리밍 초기화
      } catch (err) {
        console.error('파형 데이터 로드 오류:', err);
        setDetailWaveformData(null);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetailWaveform();
  }, [selectedPatient, selectedExam, selectedChannel]);

  // 우측 상세 차트 스트리밍 로직
  useEffect(() => {
    if (!detailWaveformData?.t || !detailWaveformData?.value) return;

    // 첫 화면에 바로 100개의 초기 데이터 로드
    if (detailStreamIndex === 0) {
      setDetailStreamIndex(Math.min(100, detailWaveformData.t.length));
    }

    const interval = setInterval(() => {
      setDetailStreamIndex(prev => {
        const newIndex = prev + 20; // 20개씩 추가
        if (newIndex >= detailWaveformData.t.length) {
          return detailWaveformData.t.length; // 끝까지 도달했을 때 유지
        }
        return newIndex;
      });
    }, 200); // 200ms마다 추가

    return () => clearInterval(interval);
  }, [detailWaveformData]);

  // 유사 신호 데이터 로드 (환자 선택 변경 시, ML Service 호출)
  useEffect(() => {
    if (!selectedPatient) return;
    mlService
      .getSimilar(selectedPatient.patient_id)
      .then(setSimilarSignals)
      .catch(() => setSimilarSignals([]));
  }, [selectedPatient]);

  // 환자 선택 핸들러
  const handlePatientSelect = useCallback((patient) => {
    setSelectedPatient(patient);
    if (patient.exams?.length > 0) {
      setSelectedExam(patient.exams[0]);
      setSelectedChannel(patient.exams[0].channels?.[0] || 'HR');
    }
  }, []);

  // 검사 선택 핸들러
  const handleExamSelect = useCallback((exam) => {
    setSelectedExam(exam);
    setSelectedChannel(exam.channels?.[0] || 'HR');
  }, []);

  // 우측 패널용 차트 데이터 준비 (메모이제이션)
  const detailChartData = useMemo(() => {
    return convertWaveformData(detailWaveformData, detailStreamIndex);
  }, [detailWaveformData, detailStreamIndex]);

  // 사용 가능한 채널
  const availableChannels = useMemo(
    () => selectedExam?.channels || ['I'],
    [selectedExam]
  );

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return patients.filter(p => p.patient_id.toLowerCase().includes(query));
  }, [searchQuery, patients]);

  // 위험도에 따라 정렬된 환자 목록 (위험할수록 위에)
  const sortedPatients = useMemo(() => {
    const riskOrder = { 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
    return [...patients].sort((a, b) => {
      const riskA = getRiskLevelValue(a.patient_id);
      const riskB = getRiskLevelValue(b.patient_id);
      return riskOrder[riskB] - riskOrder[riskA];
    });
  }, [patients]);

  // 패널 리사이징 핸들러
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const container = document.querySelector('.main-content');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // 최소값 20%, 최대값 80% 제약
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="patient-list-page">
      {error && <div className="error-message">{error}</div>}

      {/* 채널 선택 + 검색 바 (통합) */}
      <div className="control-bar">
        {/* 채널 선택 섹션 */}
        {availableChannels.length > 0 && (
          <div className="channel-selector-inline">
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
        )}

        {/* 검색 바 섹션 */}
        <div className="search-bar-inline">
          <input
            type="text"
            placeholder="🔍 환자 ID로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 (2단 레이아웃) */}
      <div 
        className={`main-content ${isResizing ? 'resizing' : ''}`}
        style={{ gridTemplateColumns: `${leftPanelWidth}% 8px calc(100% - ${leftPanelWidth}% - 8px)` }}
      >
        {/* 좌측: 환자 리스트 with 신호 미리보기 */}
        <div className="left-panel">
          {loading ? (
            <div className="loading-state">로딩 중...</div>
          ) : patients.length === 0 ? (
            <div className="empty-state">환자가 없습니다.</div>
          ) : (
            <div className="patient-preview-list">
              {sortedPatients.slice(0, 6).map((patient) => (
                <PatientPreviewCard
                  key={patient.patient_id}
                  patient={patient}
                  isSelected={selectedPatient?.patient_id === patient.patient_id}
                  onSelect={() => handlePatientSelect(patient)}
                  API_BASE={API_BASE}
                />
              ))}
            </div>
          )}
        </div>

        {/* 리사이저 */}
        <div
          className="panel-resizer"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* 우측: 패널 (상/중/하 섹션으로 분리) */}
        <div className="right-panel">
          {searchQuery && searchResults.length > 0 ? (
            <div className="right-panel-search">
              <div className="search-results">
                <h2>검색 결과 ({searchResults.length}명)</h2>
                <div className="search-results-list">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.patient_id}
                      className="search-result-item"
                      onClick={() => {
                        handlePatientSelect(patient);
                        setSearchQuery('');
                      }}
                    >
                      <div className="result-patient-id">👤 {patient.patient_id}</div>
                      <div className="result-exam-count">검사: {patient.exam_count}건</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className="empty-state">No search results.</div>
          ) : (
            <>
              {/* 상단 섹션: 환자 정보 */}
              <div className="right-section-top">
                {selectedPatient ? (
                  <div className="patient-info">
                    {/* 환자 ID 및 현재 검사 ID */}
                    <div className="patient-header">
                      <h2>{selectedPatient.patient_id}</h2>
                      {selectedExam && <span className="exam-id-badge">SubjectID: {selectedExam.exam_id}</span>}
                    </div>

                    {/* 다른 검사 버튼 */}
                    {selectedPatient.exams && selectedPatient.exams.length > 1 && (
                      <div className="other-exams-section">
                        <label>Other Exams</label>
                        <div className="exam-buttons">
                          {selectedPatient.exams.map((exam) => (
                            <button
                              key={exam.exam_id}
                              className={`exam-btn ${selectedExam?.exam_id === exam.exam_id ? 'active' : ''}`}
                              onClick={() => handleExamSelect(exam)}
                            >
                              {exam.exam_id}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admission Reason */}
                    <div className="info-group">
                      <label>Admission Reason</label>
                      <div className="info-value">Suspected ventricular arrhythmia</div>
                    </div>

                    {/* Recent Procedures */}
                    <div className="info-group">
                      <label>Recent Procedures</label>
                      <div className="info-value">ECG (2024-05-15)</div>
                    </div>

                    {/* Past Medical History */}
                    <div className="info-group">
                      <label>Past Medical History</label>
                      <div className="info-value">Hypertension, Diabetes</div>
                    </div>

                    {/* 검사 정보 및 신호 통계는 상단에서 제거됨 */}
                  </div>
                ) : (
                  <div className="empty-state">Select a patient</div>
                )}
              </div>
              
              {/* 중단 섹션: 생체신호 Waveform */}
              {selectedPatient && selectedExam && detailWaveformData && (
                <div className="right-section-middle">
                  <h3>생체신호 전체 Waveform</h3>
                  <div className="full-waveform-chart">
                    {detailChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={detailChartData} 
                          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                          style={{ background: '#131722' }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 10, fill: '#d1d4dc' }}
                            stroke="#2a2e39"
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#d1d4dc' }}
                            stroke="#2a2e39"
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={getChannelColor(selectedChannel)}
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78818f' }}>
                        로딩 중...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 하단 섹션: 유사 신호 검색 */}
              <div className="right-section-bottom">
                <SimilarSignalsList signals={similarSignals} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
