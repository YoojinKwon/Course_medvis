import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { mlService } from '../services/mlService';
import './PatientGrid.css';

const WAVEFORM_API  = 'http://localhost:5002/api';
const STREAM_WINDOW = 120;
const EVAL_FIRST    = 50;     // 5 real seconds after start  (50 simulated seconds)
const EVAL_STRIDE   = 50;     // re-eval every 5 real seconds (50 simulated seconds)
const STREAM_STEP   = 10;

const RISK_CONFIG = {
  HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   label: 'HIGH' },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'MEDIUM' },
  LOW:    { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   label: 'LOW' },
};

// 임의 환자 정보 (ID → 표시 정보)
const PATIENT_META = {
  '10014354': { name: '이원정', gender: '여', age: 67, ward: '3층 301호' },
  '10019003': { name: '권유진', gender: '남', age: 54, ward: '3층 302호' },
  '10020306': { name: '김주영', gender: '여', age: 72, ward: '4층 401호' },
  '10039708': { name: '페이커',  gender: '남', age: 28, ward: '4층 402호' },
  '10079700': { name: '구마유시', gender: '남', age: 25, ward: '5층 501호' },
  '10112163': { name: '제우스',  gender: '남', age: 24, ward: '5층 502호' },
};

function PatientCard({ patient, riskInfo, onRiskUpdate }) {
  const navigate   = useNavigate();
  const examId     = patient.exams?.[0]?.exam_id;
  const subjectId  = `p${patient.patient_id}`;
  const meta       = PATIENT_META[patient.patient_id] ?? { name: `환자 ${patient.patient_id}`, gender: '-', age: '-', ward: '-' };

  const allHR      = useRef([]);
  const allSpO2    = useRef([]);
  const streamIdx  = useRef(0);
  const totalPts   = useRef(0);
  const windowRank = useRef(0);
  const nextEvalAt = useRef(EVAL_FIRST);

  const [chartData,   setChartData]   = useState([]);
  const [dataReady,   setDataReady]   = useState(false);
  const [currentRisk, setCurrentRisk] = useState(riskInfo ?? null);

  // 데이터 fetch
  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [rHR, rSpO2] = await Promise.all([
          fetch(`${WAVEFORM_API}/waveforms/${patient.patient_id}/${examId}/HR`).then(r => r.ok ? r.json() : null),
          fetch(`${WAVEFORM_API}/waveforms/${patient.patient_id}/${examId}/SpO2`).then(r => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;
        allHR.current      = rHR?.value  ?? [];
        allSpO2.current    = rSpO2?.value ?? [];
        streamIdx.current  = STREAM_WINDOW;   // 첫 tick부터 꽉 찬 윈도우 표시
        totalPts.current   = 0;
        windowRank.current = 0;
        nextEvalAt.current = EVAL_FIRST;
        setDataReady(true);
      } catch (e) {
        console.error('Waveform fetch failed:', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [patient.patient_id, examId]);

  // 스트리밍 + 위험도 재평가
  useEffect(() => {
    if (!dataReady) return;
    const maxLen = Math.max(allHR.current.length, allSpO2.current.length);
    if (maxLen === 0) return;

    const tick = () => {
      const newTotal = totalPts.current + STREAM_STEP;
      totalPts.current = newTotal;

      const idx = (streamIdx.current + STREAM_STEP) % maxLen;
      streamIdx.current = idx;

      const start = Math.max(0, idx - STREAM_WINDOW);
      const merged = [];
      for (let i = start; i < idx || (idx === 0 && i < STREAM_WINDOW && i < maxLen); i++) {
        merged.push({ t: i, HR: allHR.current[i] ?? null, SpO2: allSpO2.current[i] ?? null });
      }
      setChartData(merged);

      if (newTotal >= nextEvalAt.current) {
        const rank = windowRank.current;
        windowRank.current += 1;
        nextEvalAt.current += EVAL_STRIDE;
        console.log(`[${subjectId}] eval rank=${rank} at totalPts=${newTotal}`);
        mlService.getRisk(subjectId, rank).then(info => {
          if (info) {
            console.log(`[${subjectId}] -> ${info.risk_level} ${(info.risk_prob * 100).toFixed(1)}%`);
            setCurrentRisk(info);
            onRiskUpdate(patient.patient_id, info);
          }
        });
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [dataReady, subjectId, onRiskUpdate, patient.patient_id]);

  const risk = currentRisk ?? { risk_level: 'LOW', risk_prob: null };
  const cfg  = RISK_CONFIG[risk.risk_level] ?? RISK_CONFIG.LOW;

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.5, ease: 'easeInOut' } }}
      className="patient-card"
      style={{ borderColor: cfg.color, background: cfg.bg }}
      onClick={() => navigate(`/patient/${patient.patient_id}`)}
    >
      <div className="card-header">
        <div className="card-name-block">
          <span className="card-name">{meta.name}</span>
          <span className="card-meta">{meta.gender} · {meta.age}세 · {meta.ward}</span>
        </div>
        <span className="card-risk" style={{ color: cfg.color, borderColor: cfg.color }}>
          {cfg.label}
          {risk.risk_prob != null && (
            <span className="card-prob"> {(risk.risk_prob * 100).toFixed(0)}%</span>
          )}
        </span>
      </div>

      <div className="card-charts">
        {chartData.length > 0 ? (
          <>
            <div className="card-channel">
              <span className="channel-label" style={{ color: '#facc15' }}>HR</span>
              <div className="channel-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Line dataKey="HR" stroke="#facc15" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card-channel">
              <span className="channel-label" style={{ color: '#38bdf8' }}>SpO2</span>
              <div className="channel-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={[80, 100]} />
                    <Line dataKey="SpO2" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="card-loading">불러오는 중...</div>
        )}
      </div>
    </motion.div>
  );
}

const ORDER = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function PatientGrid() {
  const [patients, setPatients] = useState([]);
  const [riskMap,  setRiskMap]  = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${WAVEFORM_API}/patients`);
        const data = await res.json();
        const EXCLUDE = new Set(['10082591']);   // bad data
        const list = (data.patients ?? []).filter(p => !EXCLUDE.has(p.patient_id));
        setPatients(list);

        const entries = await Promise.all(
          list.map(async p => {
            const sid  = `p${p.patient_id}`;
            const info = await mlService.getRisk(sid);
            return [p.patient_id, info];
          })
        );
        setRiskMap(Object.fromEntries(entries.filter(([, v]) => v)));
      } catch (e) {
        console.error('Patient list load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 카드에서 재평가 발생 시 riskMap 업데이트 → 자동 재정렬
  const handleRiskUpdate = useCallback((patientId, info) => {
    setRiskMap(prev => ({ ...prev, [patientId]: info }));
  }, []);

  const sorted = [...patients].sort((a, b) => {
    const ra = riskMap[a.patient_id]?.risk_level ?? 'LOW';
    const rb = riskMap[b.patient_id]?.risk_level ?? 'LOW';
    const diff = (ORDER[rb] ?? 0) - (ORDER[ra] ?? 0);
    if (diff !== 0) return diff;
    // 같은 레벨이면 확률 내림차순
    return (riskMap[b.patient_id]?.risk_prob ?? 0) - (riskMap[a.patient_id]?.risk_prob ?? 0);
  });

  return (
    <div className="grid-page">
      <div className="grid-header">
        <h1 className="grid-title">MedVis ICU Monitor</h1>
        <span className="grid-subtitle">{patients.length}명 모니터링 중</span>
      </div>

      {loading ? (
        <div className="grid-loading">데이터 로드 중...</div>
      ) : (
        <motion.div layout className="patient-grid">
          {sorted.map(p => (
            <PatientCard
              key={p.patient_id}
              patient={p}
              riskInfo={riskMap[p.patient_id]}
              onRiskUpdate={handleRiskUpdate}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
