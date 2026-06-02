import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import DetailModal from './DetailModal';
import './SimilarSignalItem.css';

const SimilarSignalItem = ({ signal, onDetailClick }) => {
  const [showModal, setShowModal] = React.useState(false);
  const [modalPos, setModalPos] = React.useState({ top: 0, right: 0 });
  const containerRef = React.useRef(null);
  const buttonRef = React.useRef(null);

  const handleShowModal = () => {
    if (!showModal && buttonRef.current && containerRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      setModalPos({
        top: buttonRect.top - 400, // 팝오버가 버튼 위에 완전히 나타나도록
        right: window.innerWidth - buttonRect.right, // 우측 정렬
      });
    }
    setShowModal(!showModal); // 토글
  };
  // 더미 차트 데이터 생성
  const generateChartData = () => {
    const data = [];
    for (let i = 0; i < 100; i++) {
      const x = i / 100;
      data.push({
        x: x.toFixed(2),
        value: Math.sin(x * 10) * Math.cos(x * 8) + (Math.random() - 0.5) * 0.2,
      });
    }
    return data;
  };

  const chartData = generateChartData();

  return (
    <div className="similar-signal-item" ref={containerRef}>
      <div className="signal-item-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" horizontal={false} />
            <XAxis dataKey="x" tick={false} stroke="none" />
            <YAxis tick={false} stroke="none" width={0} />
            
            <Line
              type="monotone"
              dataKey="value"
              stroke="#26a69a"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Highlight 배경 영역 오버레이 */}
        <div 
          className="highlight-region-overlay"
          style={{
            left: `${signal.highlight_region.start * 100}%`,
            width: `${(signal.highlight_region.end - signal.highlight_region.start) * 100}%`,
          }}
        />
      </div>

      <div className="signal-item-info">
        <div className="signal-item-meta">
          <div className="meta-row">
            <span className="meta-label">유사도:</span>
            <span className="meta-value">{(signal.similarity_score * 100).toFixed(1)}%</span>
            <span className={`risk-badge risk-${signal.risk_level.toLowerCase()}`}>
              {signal.risk_level === 'HIGH' ? '🔴' : signal.risk_level === 'MEDIUM' ? '🟡' : '🟢'} {signal.risk_level}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">환자:</span>
            <span className="meta-value">{signal.patient_id}</span>
            <span className="highlight-desc">{signal.highlight_region.description}</span>
          </div>
        </div>

        <button 
          ref={buttonRef}
          className="detail-button"
          onClick={handleShowModal}
        >
          상세보기 ▼
        </button>
      </div>

      {/* Popover 모달 */}
      {showModal && (
        <div 
          className="item-modal-popover"
          style={{
            top: `${modalPos.top}px`,
            right: `${modalPos.right}px`,
          }}
        >
          <DetailModal
            signal={signal}
            onClose={() => setShowModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default SimilarSignalItem;
