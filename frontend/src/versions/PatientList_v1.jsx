/**
 * MedVis Frontend - PatientList Component v1
 * 
 * 기능:
 * - 환자 목록 표시
 * - 위험도 기반 정렬
 * - 환자명/ID 검색
 * - 위험도 통계 표시
 * - 환자 카드 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PatientCard } from './PatientCard';
import './PatientList.css';

export const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:5001/api';

  // 백엔드에서 환자 데이터 가져오기
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/patients`);
      if (!response.ok) throw new Error('환자 데이터를 가져올 수 없습니다.');
      const data = await response.json();
      setPatients(data.patients || []);
    } catch (err) {
      console.error('환자 데이터 로드 오류:', err);
      alert('환자 데이터를 불러올 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // 정렬 함수
  const sortPatients = (patientsToSort, order) => {
    const sorted = [...patientsToSort].sort((a, b) => {
      if (order === 'desc') {
        return b.risk_score - a.risk_score;
      } else {
        return a.risk_score - b.risk_score;
      }
    });
    return sorted;
  };

  // 새로고침 (정렬 적용)
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setPatients((prevPatients) => sortPatients(prevPatients, sortOrder));
      setLoading(false);
    }, 500);
  };

  // 정렬 순서 토글
  const handleToggleSortOrder = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    setPatients((prevPatients) => sortPatients(prevPatients, newOrder));
  };

  // 환자 제거
  const removePatient = (patientId) => {
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
  };

  // 필터링된 환자 목록
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toString().includes(searchTerm)
  );

  // 위험도 통계
  const stats = {
    total: patients.length,
    critical: patients.filter((p) => p.risk_score === 4).length,
    high: patients.filter((p) => p.risk_score === 3).length,
    medium: patients.filter((p) => p.risk_score === 2).length,
    low: patients.filter((p) => p.risk_score === 1).length,
  };

  return (
    <div className="patient-list-container">
      <div className="list-header">
        <div className="header-content">
          <h1>환자 모니터링 시스템</h1>
          <p>위험도에 따라 정렬되는 생체 신호 모니터링</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn-sort ${sortOrder === 'desc' ? 'active' : ''}`}
            onClick={handleToggleSortOrder}
            title={sortOrder === 'desc' ? '위험도 내림차순 (위험도 높은 순)' : '위험도 오름차순 (위험도 낮은 순)'}
          >
            {sortOrder === 'desc' ? '위험도 ↓' : '위험도 ↑'}
          </button>
          <button className="btn-refresh" onClick={handleRefresh} disabled={loading}>
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">전체</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item critical">
          <span className="stat-label">위험</span>
          <span className="stat-value">{stats.critical}</span>
        </div>
        <div className="stat-item high">
          <span className="stat-label">높음</span>
          <span className="stat-value">{stats.high}</span>
        </div>
        <div className="stat-item medium">
          <span className="stat-label">중간</span>
          <span className="stat-value">{stats.medium}</span>
        </div>
        <div className="stat-item low">
          <span className="stat-label">낮음</span>
          <span className="stat-value">{stats.low}</span>
        </div>
      </div>

      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="환자명 또는 ID로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="patients-list">
        {filteredPatients.length === 0 ? (
          <div className="empty-state">
            <p>환자가 없습니다.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onRemove={removePatient}
            />
          ))
        )}
      </div>
    </div>
  );
};
