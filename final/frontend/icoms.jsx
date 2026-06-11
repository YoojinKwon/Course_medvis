/* ============================================================
   MedViz ICU — shared components (icons, RiskBadge, TrendWave)
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const ICON = {
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
  back: <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
  spark: <path d="m13 2-2 7h5l-3 13 2-9H9l4-11Z" fill="currentColor"/>,
  cpu: <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></g>,
  play: <path d="M7 4l13 8-13 8V4Z" fill="currentColor"/>,
  search: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="m20 20-5-5"/></g>,
  user: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></g>,
  doc: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M14 3v5h5"/><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z"/></g>,
  pill: <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)"/><path d="M8.5 8.5l7 7" transform="rotate(45 12 12)"/></g>,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>,
  clock: <g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
  chev: <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
};
function Ic({ k, s = 16, ...p }) { return <svg viewBox="0 0 24 24" width={s} height={s} {...p}>{ICON[k]}</svg>; }

const RISK_CLASS = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
function RiskBadge({ level, pct }) {
  return (
    <span className={`rbadge ${RISK_CLASS[level]}`}>
      {level}{pct != null && <span className="pct">{Math.round(pct * 100)}%</span>}
    </span>
  );
}
function RiskPill({ level }) { return <span className={`rpill ${RISK_CLASS[level]}`}>{level}</span>; }

/* ---- countdown ring ---- */
function Ring({ frac, size = 26 }) {
  const r = (size - 4) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
    </svg>
  );
}

/* ============================================================
   Trend value model — deterministic per (seed, kind), time-based
   ============================================================ */
function hashNoise(x) { const s = Math.sin(x) * 43758.5453; return s - Math.floor(s); }

function trendValue(kind, seed, t) {
  // returns ~[-1,1]
  const o = seed * 1.37;
  if (kind === 'hr') {
    let v = 0.34 * Math.sin(t * 0.5 + o) + 0.16 * Math.sin(t * 1.3 + o * 2) + 0.1 * Math.sin(t * 3.1 + o);
    v += (hashNoise(Math.floor(t * 6) + o) - 0.5) * 0.5;      // jagged beat-to-beat
    return v * 0.9;
  }
  if (kind === 'spo2') {
    // mostly near top, occasional desaturation dips
    let base = 0.62 + 0.05 * Math.sin(t * 0.4 + o);
    const dipPhase = hashNoise(Math.floor(t * 0.7) + o);
    let dip = 0;
    if (dipPhase > 0.78) {
      const local = (t * 0.7) % 1;
      dip = -1.1 * Math.exp(-Math.pow((local - 0.5) * 5, 2));
    }
    base += (hashNoise(Math.floor(t * 4) + o) - 0.5) * 0.06;
    return base + dip;
  }
  if (kind === 'wave') {
    return 0.4 * Math.sin(t * 0.6 + o) + 0.12 * Math.sin(t * 1.7 + o) + (hashNoise(Math.floor(t * 3) + o) - 0.5) * 0.12;
  }
  // flat baseline w/ micro noise
  return (hashNoise(Math.floor(t * 2) + o) - 0.5) * 0.05 + 0.02 * Math.sin(t * 0.3 + o);
}

function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }
function fitCanvas(cv) {
  const d = dpr(), w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.max(1, Math.round(w * d)); cv.height = Math.max(1, Math.round(h * d));
  const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, w, h };
}

/* ============================================================
   TrendWave — animated sweep OR static; robust prefill draw
   ============================================================ */
function TrendWave({ kind, seed = 1, color = '#e6b34a', amp = 0.42, baseline = 0.5,
                     lineWidth = 1.6, animated = true, glow = false, speed = 70, series = null }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    let raf, ctx, W = 0, H = 0, cols = [], head = 0, sigT = 0, last = performance.now();
    const pxPerSec = speed;
    const useSeries = series && series.length > 0;
    let seriesMin = Infinity, seriesMax = -Infinity;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(130,150,170,0.07)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H * baseline); ctx.lineTo(W, H * baseline); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 4; } else ctx.shadowBlur = 0;
      ctx.beginPath();
      let drawing = false; const gap = animated && !useSeries ? 12 : 0; const hc = Math.floor(head);
      for (let x = 0; x < W; x++) {
        if (animated && !useSeries) { const ahead = ((x - hc) + W) % W; if (ahead < gap) { drawing = false; continue; } }
        const v = cols[x]; if (v == null) { drawing = false; continue; }
        const y = H * baseline - v * amp * H;
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    };
    const resize = () => {
      const r = fitCanvas(cv); ctx = r.ctx; W = r.w; H = r.h;
      cols = new Array(W);
      if (useSeries) {
        // use last 1000 points for streaming (avoid memory bloat)
        const viewWindow = series.slice(-1000);
        // downsample to fit canvas width
        const step = Math.max(1, Math.floor(viewWindow.length / W));
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < viewWindow.length; i++) {
          const v = viewWindow[i];
          if (v != null && !isNaN(v)) { min = Math.min(min, v); max = Math.max(max, v); }
        }
        seriesMin = min; seriesMax = max;
        const range = max - min || 1;
        for (let x = 0; x < W; x++) {
          const idx = Math.min(x * step, viewWindow.length - 1);
          const v = viewWindow[idx];
          cols[x] = (v != null && !isNaN(v)) ? ((v - min) / range) * 2 - 1 : null;
        }
        sigT = W / pxPerSec; head = 0;
      } else {
        for (let x = 0; x < W; x++) cols[x] = trendValue(kind, seed, x / pxPerSec);
        sigT = W / pxPerSec; head = 0;
      }
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    if (animated) {
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; sigT += dt;
        const nh = head + pxPerSec * dt, s = Math.floor(head), e = Math.floor(nh);

        if (useSeries) {
          // scroll the series data from right to left
          for (let c = s; c <= e; c++) {
            const cc = ((c % W) + W) % W;
            const seriesIdx = Math.floor((series.length / W) * (head / W * W + c));
            if (seriesIdx < series.length && seriesIdx >= 0) {
              const v = series[seriesIdx];
              const range = seriesMax - seriesMin || 1;
              cols[cc] = (v != null && !isNaN(v)) ? ((v - seriesMin) / range) * 2 - 1 : null;
            }
          }
        } else {
          for (let c = s; c <= e; c++) { const cc = ((c % W) + W) % W; cols[cc] = trendValue(kind, seed, sigT - (nh - c) / pxPerSec); }
        }
        head = nh % W; draw(); raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, seed, color, amp, baseline, lineWidth, animated, glow, speed, series]);
  return <canvas ref={ref} />;
}

Object.assign(window, { Ic, RiskBadge, RiskPill, Ring, TrendWave, trendValue, useState, useEffect, useRef, useMemo, useCallback });
