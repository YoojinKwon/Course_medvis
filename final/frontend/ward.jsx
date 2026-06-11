/* ============================================================
   MedViz ICU — Page 1: multi-patient ward grid
   - vitals strip (HR / SpO2 / NBP / RR)
   - signal view toggle (HR only / SpO2 only / both)
   - FLIP animated reorder when model re-ranks risk
   ============================================================ */
function PatientCard({ p, onOpen, moved, glowing, signalView, cardRef }) {
  const cls = p.risk === 'HIGH' ? 'high' : p.risk === 'MEDIUM' ? 'medium' : 'low';
  const showHR = signalView === 'hr' || signalView === 'both';
  const showSpO2 = signalView === 'spo2' || signalView === 'both';
  const single = signalView !== 'both';
  return (
    <div className={`pcard ${cls} ${moved ? 'moved' : ''} ${glowing ? 'glowing' : ''}`} onClick={() => onOpen(p)} ref={cardRef}>
      <div className="pcard-top">
        <div>
          <div className="pcard-name">{p.name}</div>
          <div className="pcard-demo">{p.sex} · {p.age}세 · {p.room}</div>
        </div>
        <RiskBadge level={p.risk} pct={p.prob} />
      </div>

      <div className="pcard-vitals">
        <div className="pv"><span className="n" style={{ color: 'var(--hr)' }}>{p.hr}</span><span className="l">HR</span></div>
        <div className="pv"><span className="n" style={{ color: 'var(--spo2)' }}>{p.spo2}</span><span className="l">SpO₂</span></div>
        <div className="pv"><span className="n" style={{ color: '#fb7185' }}>{p.bp}</span><span className="l">NBP</span></div>
        <div className="pv"><span className="n" style={{ color: '#fbbf24' }}>{p.rr}</span><span className="l">RR</span></div>
      </div>

      <div className={`pcard-waves ${single ? 'single' : ''}`}>
        {showHR && (
          <div className="wrow">
            <span className="wlabel" style={{ color: 'var(--hr)' }}>HR</span>
            <TrendWave kind="hr" seed={p.seed} color="#e6b34a" amp={0.36} baseline={0.42} lineWidth={1.5} animated={true} speed={50} glow series={p.waveformSeries?.hr} />
          </div>
        )}
        {showSpO2 && (
          <div className="wrow">
            <span className="wlabel" style={{ color: 'var(--spo2)' }}>SpO₂</span>
            <TrendWave kind="spo2" seed={p.seed + 7} color="#46b7f0" amp={0.4} baseline={0.45} lineWidth={1.5} animated={true} speed={50} glow series={p.waveformSeries?.spo2} />
          </div>
        )}
      </div>
    </div>
  );
}

function WardGrid({ patients, onOpen, movedIds, glowingIds, signalView }) {
  const nodes = useRef(new Map());
  const prevPos = useRef(new Map());

  // FLIP: animate cards sliding to new positions after a re-rank
  React.useLayoutEffect(() => {
    const next = new Map();
    nodes.current.forEach((el, id) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.set(id, r);
      const p = prevPos.current.get(id);
      if (p) {
        const dx = p.left - r.left, dy = p.top - r.top;
        if (dx || dy) {
          el.style.transition = 'none';
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          void el.offsetWidth; // force reflow
          el.style.transition = 'transform 540ms cubic-bezier(.4,0,.2,1)';
          el.style.transform = '';
        }
      }
    });
    prevPos.current = next;
  }, [patients, signalView]);

  return (
    <div className="ward scroll">
      <div className="ward-grid">
        {patients.map((p) => (
          <PatientCard key={p.id} p={p} onOpen={onOpen} moved={movedIds.has(p.id)} glowing={glowingIds.has(p.id)} signalView={signalView}
            cardRef={(el) => { if (el) nodes.current.set(p.id, el); else nodes.current.delete(p.id); }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { WardGrid });
