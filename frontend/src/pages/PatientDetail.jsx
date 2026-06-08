import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mlService } from '../services/mlService';
import NumericsChart from '../components/NumericsChart';
import './PatientDetail.css';

const RISK_CONFIG = {
  HIGH:   { color: '#ef4444', label: 'HIGH' },
  MEDIUM: { color: '#f59e0b', label: 'MEDIUM' },
  LOW:    { color: '#22c55e', label: 'LOW' },
};

/* 유사환자 패널 */
function SimilarPanel({ subjectId }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!subjectId) return;
    mlService.getSimilar(subjectId, 6).then(setList).catch(() => setList([]));
  }, [subjectId]);

  if (list === null) return <div className="similar-loading">유사 환자 검색 중...</div>;
  if (list.length === 0) return <div className="similar-empty">유사 환자를 찾을 수 없습니다.</div>;

  return (
    <div className="similar-list">
      {list.map(s => {
        const cfg = RISK_CONFIG[s.risk_level] ?? RISK_CONFIG.LOW;
        return (
          <div key={s.id} className="similar-item">
            <div className="si-left">
              <span className="si-pid">{s.patient_id}</span>
              <span className="si-risk" style={{ color: cfg.color, borderColor: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <div className="si-right">
              <span className="si-sim">유사도 {(s.similarity_score * 100).toFixed(1)}%</span>
              <span className={`si-event ${s.label === 1 ? 'event-yes' : 'event-no'}`}>
                {s.label === 1 ? '이상 이벤트 발생' : '이상 없음'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 환자 정보 패널 */
function InfoPanel({ subjectId, riskData }) {
  if (!riskData) return <div className="info-loading">정보 로드 중...</div>;

  const cfg = RISK_CONFIG[riskData.risk_level] ?? RISK_CONFIG.LOW;

  return (
    <div className="info-panel">
      <div className="info-row">
        <span className="info-label">환자 ID</span>
        <span className="info-value mono">{subjectId}</span>
      </div>
      <div className="info-row">
        <span className="info-label">위험도</span>
        <span className="info-value" style={{ color: cfg.color, fontWeight: 700 }}>
          {cfg.label} ({(riskData.risk_prob * 100).toFixed(1)}%)
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">분류 윈도우</span>
        <span className="info-value mono">#{riskData.window_idx}</span>
      </div>
      <div className="info-row">
        <span className="info-label">실제 레이블</span>
        <span className="info-value">
          {riskData.label === 1 ? '이상 이벤트 (1)' : '정상 (0)'}
        </span>
      </div>
      <div className="info-row">
        <span className="info-label">데이터소스</span>
        <span className="info-value">MIMIC-IV Waveform DB</span>
      </div>
      <div className="info-row">
        <span className="info-label">모델</span>
        <span className="info-value">Linear + LogisticRegression</span>
      </div>
    </div>
  );
}

/* 메인 */
export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate      = useNavigate();
  const subjectId     = `p${patientId}`;

  const [riskData,     setRiskData]     = useState(null);
  const [numericsData, setNumericsData] = useState(null);
  const [shapData,     setShapData]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNumericsData(null);
    setShapData(null);

    const load = async () => {
      try {
        // 위험도 + 17채널 동시 로드
        const [risk, numerics] = await Promise.all([
          mlService.getRisk(subjectId),
          mlService.getNumerics ? mlService.getNumerics(subjectId) : fetchNumerics(subjectId),
        ]);

        if (!risk || !numerics) {
          setError('ML 서비스에서 데이터를 가져올 수 없습니다. ml_service가 실행 중인지 확인하세요.');
          return;
        }

        setRiskData(risk);
        setNumericsData(numerics);

        // HIGH인 경우에만 SHAP 로드
        if (risk.risk_level === 'HIGH') {
          const shap = await mlService.getShap(subjectId, risk.window_idx);
          setShapData(shap);
        }
      } catch (e) {
        setError('데이터 로드 중 오류가 발생했습니다: ' + e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="detail-loading-page">
        <div className="detail-spinner" />
        <div className="detail-loading-text">{subjectId} 데이터 로드 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-error-page">
        <div className="detail-error-msg">{error}</div>
        <button className="back-btn" onClick={() => navigate('/')}>← 목록으로</button>
      </div>
    );
  }

  const riskCfg = RISK_CONFIG[riskData?.risk_level] ?? RISK_CONFIG.LOW;

  return (
    <div className="detail-page">
      {/* 헤더 */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>← 목록</button>
        <div className="detail-title">
          <span className="detail-pid">{subjectId}</span>
          <span className="detail-risk-badge" style={{ background: `${riskCfg.color}22`, color: riskCfg.color, borderColor: riskCfg.color }}>
            {riskCfg.label} · {(riskData?.risk_prob * 100).toFixed(0)}%
          </span>
          {riskData?.risk_level === 'HIGH' && (
            <span className="shap-active-tag">SHAP 분석 활성</span>
          )}
        </div>
      </div>

      {/* 본문: 좌(차트) / 우(정보+유사) */}
      <div className="detail-body">
        {/* 좌측: 17채널 + SHAP */}
        <div className="detail-left">
          {numericsData && (
            <NumericsChart
              numericsData={numericsData}
              shapData={shapData}
            />
          )}
        </div>

        {/* 우측 */}
        <div className="detail-right">
          {/* 환자 정보 */}
          <div className="right-section">
            <h3 className="section-title">환자 정보</h3>
            <InfoPanel subjectId={subjectId} riskData={riskData} />
          </div>

          {/* 유사 환자 */}
          <div className="right-section right-section-similar">
            <h3 className="section-title">유사 신호 환자</h3>
            <SimilarPanel subjectId={subjectId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* mlService에 getNumerics 없으면 직접 fetch */
async function fetchNumerics(subjectId) {
  try {
    const res = await fetch(`http://localhost:5003/api/ml/numerics/${subjectId}`);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}
