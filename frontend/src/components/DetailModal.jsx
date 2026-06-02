import React from 'react';
import './DetailModal.css';

const DetailModal = ({ signal, onClose, itemRef }) => {
  if (!signal) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date;
  };

  const getDaysHospitalized = () => {
    if (!signal.admission_date || !signal.discharge_date) return 'N/A';
    const start = new Date(signal.admission_date);
    const end = new Date(signal.discharge_date);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return `${days}일`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <h2 className="modal-title">환자 {signal.patient_id} - 상세 정보</h2>
            <span className={`modal-risk-badge risk-${signal.risk_level.toLowerCase()}`}>
              {signal.risk_level === 'HIGH' ? '🔴' : signal.risk_level === 'MEDIUM' ? '🟡' : '🟢'} {signal.risk_level}
            </span>
          </div>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <h3>임상 정보</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>입원 사유</label>
                <p className="info-value">{signal.admission_reason}</p>
              </div>
              <div className="info-item">
                <label>입원일</label>
                <p className="info-value">{formatDate(signal.admission_date)}</p>
              </div>
              <div className="info-item">
                <label>퇴원일</label>
                <p className="info-value">{formatDate(signal.discharge_date)}</p>
              </div>
              <div className="info-item">
                <label>입원 기간</label>
                <p className="info-value">{getDaysHospitalized()}</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>유사도 정보</h3>
            <div className="similarity-bar">
              <div className="similarity-fill" style={{ width: `${signal.similarity_score * 100}%` }}></div>
            </div>
            <div className="similarity-text">
              유사도: <strong>{(signal.similarity_score * 100).toFixed(1)}%</strong>
            </div>
            <div className="highlight-info">
              <span className="highlight-label">매칭 영역:</span>
              <span className="highlight-value">
                {(signal.highlight_region.start * 100).toFixed(1)}% ~ {(signal.highlight_region.end * 100).toFixed(1)}%
              </span>
              <span className="highlight-desc">{signal.highlight_region.description}</span>
            </div>
          </div>

          <div className="info-section clinical-notes-section">
            <h3>임상 노트</h3>
            <div className="clinical-notes">
              {signal.note}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-action-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
