import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamCard } from './ExamCard';
import './PatientList.css';

export const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE = 'http://localhost:5001/api';

  // 백엔드에서 환자 데이터 가져오기
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/patients`);
      if (!response.ok) throw new Error('환자 데이터를 가져올 수 없습니다.');
      const data = await response.json();
      setPatients(data.patients || []);
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

  // 통계 계산
  const stats = {
    total_patients: patients.length,
    total_exams: patients.reduce((sum, p) => sum + p.exam_count, 0),
  };

  // 검사별 플랫 리스트로 변환
  const flatExams = patients.flatMap((patient) =>
    patient.exams.map((exam) => ({
      ...exam,
      patient_id: patient.patient_id,
    }))
  );

  return (
    <div className="patient-list-container">
      <div className="list-header">
        <div className="header-content">
          <h1>🏥 MIMIC-IV 검사 모니터링</h1>
          <p>실제 생체 신호 데이터 시각화</p>
        </div>
        <button className="btn-refresh" onClick={fetchPatients} disabled={loading}>
          {loading ? '⏳ 로딩 중...' : '🔄 새로고침'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">환자</span>
          <span className="stat-value">{stats.total_patients}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">검사</span>
          <span className="stat-value">{stats.total_exams}</span>
        </div>
      </div>

      <div className="exams-list">
        {loading ? (
          <div className="loading-state">
            <p>📂 데이터를 불러오는 중...</p>
          </div>
        ) : flatExams.length === 0 ? (
          <div className="empty-state">
            <p>검사 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="exams-table">
            {flatExams.map((exam) => (
              <ExamCard
                key={`${exam.patient_id}-${exam.exam_id}`}
                patientId={exam.patient_id}
                exam={exam}
                onClick={() =>
                  navigate(`/patient/${exam.patient_id}/exam/${exam.exam_id}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
