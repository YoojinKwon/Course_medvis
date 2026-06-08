import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, ReferenceArea, Tooltip,
} from 'recharts';
import './NumericsChart.css';

const CH_COLORS = [
  '#38bdf8','#f472b6','#4ade80','#fb923c',
  '#a78bfa','#facc15','#f87171','#34d399',
  '#60a5fa','#e879f9','#86efac','#fcd34d',
  '#93c5fd','#f9a8d4','#6ee7b7','#fde68a','#c4b5fd',
];

const SHAP_THRESHOLD = 0.5;   // |SHAP| / vmax 이상일 때만 박스 표시
const CH_HEIGHT_PX   = 72;    // 채널당 높이

function ChannelChart({ name, color, data, shapPatches, timestamps }) {
  const chartData = useMemo(() => {
    return timestamps.map((t, i) => ({ t, v: data[i] ?? null }));
  }, [data, timestamps]);

  const yVals = data.filter(v => v != null);
  const yMin  = yVals.length ? Math.min(...yVals) : 0;
  const yMax  = yVals.length ? Math.max(...yVals) : 1;
  const pad   = (yMax - yMin) * 0.2 || 0.5;
  const domain = [yMin - pad, yMax + pad];

  return (
    <div className="ch-row">
      <div className="ch-label" style={{ color }}>{name}</div>
      <div className="ch-chart-wrap">
        <ResponsiveContainer width="100%" height={CH_HEIGHT_PX}>
          <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
            <XAxis dataKey="t" hide domain={[0, timestamps.at(-1) ?? 1]} type="number" />
            <YAxis hide domain={domain} />

            {/* SHAP 박스 오버레이 */}
            {shapPatches?.map((p, i) =>
              p.show ? (
                <ReferenceArea
                  key={i}
                  x1={p.x1} x2={p.x2}
                  y1={domain[0]} y2={domain[1]}
                  fill={`rgba(220,38,38,${p.alpha})`}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
              ) : null
            )}

            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.4}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function NumericsChart({ numericsData, shapData }) {
  const { channels, timestamps, data, risk_level, risk_prob } = numericsData;
  const isHigh = risk_level === 'HIGH';
  const N_PATCHES = 16;

  // SHAP 패치 → ReferenceArea 좌표로 변환
  const shapPatchesPerCh = useMemo(() => {
    if (!isHigh || !shapData) return null;

    const { values, vmax } = shapData;   // values: (17, 16)
    const T = timestamps.length;
    const patchLen = T / N_PATCHES;
    const tEnd = timestamps.at(-1) ?? 1;

    return values.map(chShap =>
      Array.from({ length: N_PATCHES }, (_, p) => {
        const rel = Math.abs(chShap[p]) / (vmax + 1e-9);
        return {
          show: rel >= SHAP_THRESHOLD,
          alpha: Math.min(0.75, 0.2 + rel * 0.65),
          x1: timestamps[Math.round(p * patchLen)] ?? 0,
          x2: timestamps[Math.min(Math.round((p + 1) * patchLen) - 1, T - 1)] ?? tEnd,
        };
      })
    );
  }, [isHigh, shapData, timestamps]);

  return (
    <div className="numerics-chart">
      <div className="nc-header">
        <span className="nc-title">17채널 생체신호</span>
        {isHigh && (
          <span className="nc-shap-badge">
            SHAP 표시 중 (위험 기여 구간)
          </span>
        )}
        <span className="nc-time">
          {timestamps.at(-1)?.toFixed(1)}분 윈도우 · Risk {(risk_prob * 100).toFixed(0)}%
        </span>
      </div>

      <div className="nc-scroll">
        {channels.map((ch, i) => (
          <ChannelChart
            key={ch}
            name={ch}
            color={CH_COLORS[i % CH_COLORS.length]}
            data={data[i]}
            timestamps={timestamps}
            shapPatches={shapPatchesPerCh?.[i] ?? null}
          />
        ))}
      </div>

      {isHigh && (
        <div className="nc-legend">
          <span className="nc-legend-box" />
          빨간 구간 = SHAP 기여도 50% 이상 (위험 판단에 기여한 시간대)
        </div>
      )}
    </div>
  );
}
