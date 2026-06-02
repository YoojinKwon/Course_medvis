import React, { useState, useMemo } from 'react';
import SimilarSignalItem from './SimilarSignalItem';
import './SimilarSignalsList.css';

const SimilarSignalsList = ({ signals = [] }) => {
  const [sortBy, setSortBy] = useState('similarity'); // 'similarity' or 'risk'
  const [filterRisk, setFilterRisk] = useState('all'); // 'all', 'HIGH', 'MEDIUM', 'LOW'

  // 정렬 및 필터링 처리
  const sortedAndFilteredSignals = useMemo(() => {
    let filtered = signals;

    // 위험도 필터링
    if (filterRisk !== 'all') {
      filtered = filtered.filter((s) => s.risk_level === filterRisk);
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'similarity') {
        return b.similarity_score - a.similarity_score; // 내림차순
      } else if (sortBy === 'risk') {
        const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return riskOrder[b.risk_level] - riskOrder[a.risk_level]; // HIGH > MEDIUM > LOW
      }
      return 0;
    });

    return sorted;
  }, [signals, sortBy, filterRisk]);

  const riskCounts = useMemo(() => {
    return {
      HIGH: signals.filter((s) => s.risk_level === 'HIGH').length,
      MEDIUM: signals.filter((s) => s.risk_level === 'MEDIUM').length,
      LOW: signals.filter((s) => s.risk_level === 'LOW').length,
    };
  }, [signals]);

  return (
    <div className="similar-signals-list">
      <div className="list-header">
        <h3 className="list-title">유사 신호</h3>
        <span className="list-count">{signals.length}</span>
      </div>

      <div className="controls-row">
        <div className="sort-controls">
          <label className="sort-label">정렬:</label>
          <button
            className={`sort-btn ${sortBy === 'similarity' ? 'active' : ''}`}
            onClick={() => setSortBy('similarity')}
          >
            유사도순
          </button>
          <button
            className={`sort-btn ${sortBy === 'risk' ? 'active' : ''}`}
            onClick={() => setSortBy('risk')}
          >
            위험도순
          </button>
        </div>

        <div className="filter-controls">
          <label className="filter-label">위험도:</label>
          <button
            className={`filter-btn ${filterRisk === 'all' ? 'active' : ''}`}
            onClick={() => setFilterRisk('all')}
          >
            전체 ({signals.length})
          </button>
          <button
            className={`filter-btn filter-high ${filterRisk === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilterRisk('HIGH')}
          >
            🔴 H ({riskCounts.HIGH})
          </button>
          <button
            className={`filter-btn filter-medium ${filterRisk === 'MEDIUM' ? 'active' : ''}`}
            onClick={() => setFilterRisk('MEDIUM')}
          >
            🟡 M ({riskCounts.MEDIUM})
          </button>
          <button
            className={`filter-btn filter-low ${filterRisk === 'LOW' ? 'active' : ''}`}
            onClick={() => setFilterRisk('LOW')}
          >
            🟢 L ({riskCounts.LOW})
          </button>
        </div>
      </div>

      <div className="signals-container">
        {sortedAndFilteredSignals.length > 0 ? (
          sortedAndFilteredSignals.map((signal) => (
            <SimilarSignalItem
              key={signal.id}
              signal={signal}
            />
          ))
        ) : (
          <div className="empty-state">
            <p>유사 신호를 찾을 수 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimilarSignalsList;
