import React from 'react';
import './ExamCard.css';

export const ExamCard = ({ patientId, exam, onClick }) => {
  return (
    <div className="exam-list-item" onClick={onClick}>
      <div className="exam-item-left">
        <div className="exam-id-section">
          <span className="patient-label">👤</span>
          <span className="patient-id">{patientId}</span>
          <span className="separator">|</span>
          <span className="exam-id">{exam.exam_id}</span>
        </div>
      </div>

      <div className="exam-item-middle">
        <div className="channels-badges">
          {exam.channels.map((channel) => (
            <span key={channel} className="channel-badge">
              {channel}
            </span>
          ))}
        </div>
      </div>

      <div className="exam-item-right">
        <button className="view-btn">파형 보기</button>
      </div>
    </div>
  );
};
