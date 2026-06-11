/* ============================================================
   MedViz ICU — app router, 2-min model loop, alerts & notifications
   ============================================================ */
const CYCLE = 40; // seconds between model runs (represents the 2-min cycle, accelerated for demo)

function initPatients(seed) {
  return [...seed]
    .map(p => ({ ...p, risk: window.ICU.riskOf(p.prob) }))
    .sort((a, b) => b.prob - a.prob);
}
function clockStr() {
  const d = new Date();
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ICUApp() {
  // All state declarations first (React Hooks rules)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [icu, setIcu] = useState(null);
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState({ page: 'ward' });
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [alertFlash, setAlertFlash] = useState(false);
  const [movedIds, setMovedIds] = useState(new Set());
  const [glowingIds, setGlowingIds] = useState(new Set());
  const [count, setCount] = useState(CYCLE);
  const [shapOn, setShapOn] = useState(true);
  const [signalView, setSignalView] = useState('both');
  const [expandPid, setExpandPid] = useState(null);
  const [showThreshold, setShowThreshold] = useState(false);
  const [firstRun, setFirstRun] = useState(true);

  // All ref declarations
  const patientsRef = useRef(patients);
  const audioRef = useRef(null);

  // All effects and callbacks
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  // Wait for ICU data to load
  useEffect(() => {
    const waitForData = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 600; // 60 seconds total
        while (!window.ICU_LOADED) {
          if (attempts % 20 === 0) {
            console.log(`[App] Waiting for ICU data... (${attempts * 100}ms)`);
          }
          if (attempts > maxAttempts) throw new Error('ICU data load timeout after 60 seconds');
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        console.log('[App] ICU data loaded, initializing...');
        setIcu(window.ICU);
        setPatients(initPatients(window.ICU.patients));
        setLoading(false);
      } catch (err) {
        console.error('[App] Data load error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    waitForData();
  }, []);

  // ---- audio (unlocked on first interaction) ----
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) { try { audioRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    const a = audioRef.current; if (a && a.state === 'suspended') a.resume(); return a;
  }, []);
  useEffect(() => {
    const h = () => ensureAudio();
    window.addEventListener('pointerdown', h);
    return () => window.removeEventListener('pointerdown', h);
  }, [ensureAudio]);
  const beep = useCallback(() => {
    const ctx = ensureAudio(); if (!ctx) return;
    const t0 = ctx.currentTime;
    [988, 1319, 988].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const s = t0 + i * 0.2;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.16, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      o.start(s); o.stop(s + 0.2);
    });
  }, [ensureAudio]);

  // ---- update vitals (HR/SpO2/RR) every 2 seconds ----
  const updateVitals = useCallback(() => {
    if (!icu) return;
    setPatients(cur => cur.map(p => {
      const hrChange = (Math.random() - 0.5) * 6;
      const spo2Change = (Math.random() - 0.5) * 2;
      const rrChange = (Math.random() - 0.5) * 3;
      const bpChange = (Math.random() - 0.5) * 3;

      const newHR = icu.clamp(p.hr + hrChange, 40, 160);
      const newSpO2 = icu.clamp(p.spo2 + spo2Change, 80, 100);
      const newRR = icu.clamp(p.rr + rrChange, 6, 50);
      const [nbps, nbpd] = p.bp.split('/').map(Number);
      const newBPS = icu.clamp(nbps + bpChange, 90, 180);
      const newBPD = icu.clamp(nbpd + (Math.random() - 0.5) * 2, 50, 120);

      // Add new data points to series (normalize to -1~1 range for consistency with initial data)
      // HR: typical range 40-160, normalize to -1~1
      const hrNormalized = ((newHR - 40) / 120) * 2 - 1;
      p.waveformSeries.hr.push(Math.max(-1, Math.min(1, hrNormalized)));

      // SpO2: typical range 80-100, normalize to -1~1
      const spo2Normalized = ((newSpO2 - 80) / 20) * 2 - 1;
      p.waveformSeries.spo2.push(Math.max(-1, Math.min(1, spo2Normalized)));

      return {
        ...p,
        hr: Math.round(newHR),
        spo2: Math.round(newSpO2),
        rr: Math.round(newRR),
        bp: `${Math.round(newBPS)}/${Math.round(newBPD)}`,
      };
    }));
  }, [icu]);

  // ---- model run (risk update & reorder) every 40 seconds ----
  const runModel = useCallback(async () => {
    if (!icu) return;
    const cur = patientsRef.current;
    const newHighs = [];

    // First run: fetch backend values. After that, use frontend simulation
    let next = cur;
    if (firstRun) {
      console.log('[App] First model run: fetching backend risk values...');
      next = await Promise.all(cur.map(async (p) => {
        try {
          const resp = await fetch(`${window.ML_BASE}/api/ml/risk/${p.id}`);
          if (resp.ok) {
            const data = await resp.json();
            const prob = data.risk_prob;
            const risk = icu.riskOf(prob);
            if (risk === 'HIGH' && p.risk !== 'HIGH') {
              newHighs.push({ id: p.id, name: p.name, prob });
            }
            console.log(`[App] ${p.id}: updated prob=${prob} (from backend)`);
            return { ...p, prob, risk };
          }
        } catch (err) {
          console.warn(`[App] Failed to fetch risk for ${p.id}:`, err);
        }
        // Fallback: use frontend calculation if backend fails
        const prob = icu.clamp(p.prob + p.drift + (Math.random() - 0.5) * p.vol * 2, 0.02, 0.985);
        const risk = icu.riskOf(prob);
        if (risk === 'HIGH' && p.risk !== 'HIGH') newHighs.push({ id: p.id, name: p.name, prob });
        return { ...p, prob, risk };
      }));
      setFirstRun(false);  // Switch to frontend simulation after first run
    } else {
      // Subsequent runs: use frontend simulation
      next = cur.map(p => {
        const prob = icu.clamp(p.prob + p.drift + (Math.random() - 0.5) * p.vol * 2, 0.02, 0.985);
        const risk = icu.riskOf(prob);
        if (risk === 'HIGH' && p.risk !== 'HIGH') newHighs.push({ id: p.id, name: p.name, prob });
        return { ...p, prob, risk };
      });
    }

    next.sort((a, b) => b.prob - a.prob);

    // Debug: log waveform series stats
    console.log('[App] After runModel:');
    next.forEach((p, i) => {
      const hr = p.waveformSeries.hr;
      if (hr && hr.length > 0) {
        const min = Math.min(...hr);
        const max = Math.max(...hr);
        console.log(`  ${p.id}: HR length=${hr.length}, min=${min.toFixed(2)}, max=${max.toFixed(2)}, range=${(max-min).toFixed(2)}`);
      }
    });

    // Track patients with risk level changes (glow effect)
    const changedIds = new Set();
    for (let i = 0; i < cur.length; i++) {
      const oldRisk = cur[i].risk;
      const newRisk = next[i].risk;
      if (oldRisk !== newRisk) {
        changedIds.add(cur[i].id);
      }
    }

    setPatients(next);

    // Add changed patients to glowing list
    if (changedIds.size > 0) {
      console.log('[App] Risk changed for:', [...changedIds]);
      setGlowingIds(ids => {
        const updated = new Set([...ids, ...changedIds]);
        console.log('[App] Updated glowingIds:', [...updated]);
        return updated;
      });
    }

    if (newHighs.length) {
      beep();
      const now = clockStr();
      setNotifs(ns => [
        ...newHighs.map(p => ({ key: p.id + '-' + Date.now(), patientId: p.id, name: p.name, prob: p.prob, time: now })),
        ...ns,
      ]);
      setAlertFlash(true); setTimeout(() => setAlertFlash(false), 3200);
      setMovedIds(new Set(newHighs.map(p => p.id)));
      setTimeout(() => setMovedIds(new Set()), 1600);
    }
  }, [beep, icu, firstRun]);

  // ---- vitals update every 2 seconds ----
  useEffect(() => {
    const vitalsIv = setInterval(() => updateVitals(), 2000);
    return () => clearInterval(vitalsIv);
  }, [updateVitals]);

  // ---- model run countdown & execution ----
  useEffect(() => {
    const countdownIv = setInterval(() => {
      setCount(c => { if (c <= 1) { runModel(); return CYCLE; } return c - 1; });
    }, 1000);
    return () => clearInterval(countdownIv);
  }, [runModel]);
  const runNow = () => { runModel(); setCount(CYCLE); };

  // ---- navigation ----
  const openDetail = (p) => {
    setView({ page: 'detail', id: p.id });
    setBellOpen(false);
    setGlowingIds(ids => {
      const next = new Set(ids);
      next.delete(p.id);
      return next;
    });
  };

  // Remove individual notification
  const removeNotification = (notifKey) => {
    setNotifs(ns => {
      const updated = ns.filter(n => n.key !== notifKey);
      // If no more notifications for this patient, remove glow
      const removedNotif = ns.find(n => n.key === notifKey);
      if (removedNotif && !updated.some(n => n.patientId === removedNotif.patientId)) {
        setGlowingIds(ids => {
          const next = new Set(ids);
          next.delete(removedNotif.patientId);
          return next;
        });
      }
      return updated;
    });
  };
  const detailPatient = view.page === 'detail' ? patients.find(p => p.id === view.id) : null;

  // accumulate risk-alert counts per patient (newest-first source)
  const unread = notifs.length;

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-name">MedVis ICU Monitor</div>
          </div>
          <div className="topbar-spacer" />
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18 }}>
          데이터 로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-name">MedVis ICU Monitor</div>
          </div>
          <div className="topbar-spacer" />
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: '#e53e3e' }}>
          오류: {error}
        </div>
      </div>
    );
  }

  if (!icu) {
    return <div>데이터를 불러올 수 없습니다.</div>;
  }

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <header className="topbar">
        {view.page === 'ward' && (
          <>
            <div className="tb-brand">
              <span className="tb-title">MedVis ICU Monitor</span>
              <span className="tb-sub">{patients.length}명 모니터링 중</span>
            </div>
            <div className="tb-spacer" />
            <div className="vseg" title="카드에 표시할 신호">
              <span className="lbl">신호</span>
              <button className={signalView === 'hr' ? 'active' : ''} onClick={() => setSignalView('hr')}>HR</button>
              <button className={signalView === 'spo2' ? 'active' : ''} onClick={() => setSignalView('spo2')}>SpO₂</button>
              <button className={signalView === 'both' ? 'active' : ''} onClick={() => setSignalView('both')}>둘 다</button>
            </div>
            <div className="model-clock">
              <Ring frac={count / CYCLE} />
              <span>다음 모델 실행 <b>{count}s</b></span>
            </div>
            <button className="run-now" onClick={runNow}><Ic k="play" s={13} /> 지금 실행</button>
          </>
        )}
        {view.page === 'detail' && detailPatient && (
          <>
            <button className="tb-back" onClick={() => setView({ page: 'ward' })}><Ic k="back" s={15} /> 목록</button>
            <span className="tb-pid">{detailPatient.id}</span>
            <RiskBadge level={detailPatient.risk} pct={detailPatient.prob} />
            <div className="tb-spacer" />
            <button className={`tb-btn ${shapOn ? 'on' : ''}`} onClick={() => setShapOn(s => !s)}>
              <Ic k="bolt" s={14} /> SHAP 분석 {shapOn ? '활성' : '비활성'}
            </button>
          </>
        )}

        {/* threshold info button */}
        <button
          className="tb-btn"
          onClick={() => setShowThreshold(o => !o)}
          title="위험도 분류 기준"
          style={{ position: 'relative' }}
        >
          <Ic k="info" s={14} /> 분류 기준
        </button>

        {/* notification bell — always present */}
        <button className={`bell ${alertFlash ? 'alert' : ''}`} onClick={() => setBellOpen(o => !o)} aria-label="알림">
          <Ic k="bell" s={18} />
          {unread > 0 && <span className="count">{unread}</span>}
        </button>
        {showThreshold && (
          <div style={{
            position: 'fixed',
            top: 60,
            right: 20,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px 20px',
            minWidth: 240,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text)' }}>
              <div style={{ marginBottom: 12, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                위험도 분류 기준
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: 'var(--high)', fontWeight: 600 }}>🔴 HIGH</div>
                <div style={{ color: 'var(--text-faint)', marginLeft: 20 }}>≥ 60%</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: 'var(--medium)', fontWeight: 600 }}>🟡 MEDIUM</div>
                <div style={{ color: 'var(--text-faint)', marginLeft: 20 }}>35% ~ 60%</div>
              </div>
              <div>
                <div style={{ color: 'var(--low)', fontWeight: 600 }}>🟢 LOW</div>
                <div style={{ color: 'var(--text-faint)', marginLeft: 20 }}>{'<'} 35%</div>
              </div>
            </div>
          </div>
        )}

        {bellOpen && (
          <div className="notif-pop">
            <div className="notif-head">
              <Ic k="bell" s={15} style={{ color: 'var(--high)' }} />
              <h3>위험 알림 · 환자별</h3>
              <div className="spacer" />
              {unread > 0 && <button className="notif-clear" onClick={() => { setNotifs([]); setExpandPid(null); setGlowingIds(new Set()); }}>모두 지우기</button>}
            </div>
            <div className="notif-list scroll">
              {(() => {
                const m = new Map();
                notifs.forEach(n => {
                  if (!m.has(n.patientId)) m.set(n.patientId, { patientId: n.patientId, name: n.name, count: 0, last: n.time, lastProb: n.prob, items: [] });
                  const g = m.get(n.patientId); g.count++; g.items.push(n);
                });
                const grouped = [...m.values()].sort((a, b) => b.count - a.count);
                return grouped.length === 0 ? (
                  <div className="notif-empty">HIGH 전환 알림이 환자별로 쌓입니다.<br />계속 보고 있지 않아도 추적됩니다.</div>
                ) : grouped.map(g => (
                <div key={g.patientId}>
                  <div className="notif-item" onClick={() => openDetail({ id: g.patientId })}>
                    <div className="notif-dot" />
                    <div className="notif-main">
                      <div className="notif-name">{g.name} <span className="pid-mini">{g.patientId}</span></div>
                      <div className="notif-text">최근 HIGH {Math.round(g.lastProb * 100)}% · {g.last}</div>
                    </div>
                    <div className="ng-right">
                      <span className="ng-count">위험 {g.count}회</span>
                      <button className={`ng-chev ${expandPid === g.patientId ? 'open' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setExpandPid(p => p === g.patientId ? null : g.patientId); }}
                        aria-label="이력"><Ic k="chev" s={15} /></button>
                    </div>
                  </div>
                  {expandPid === g.patientId && (
                    <div className="ng-history">
                      {g.items.map(it => (
                        <div className="ng-h" key={it.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>HIGH 진입 · {Math.round(it.prob * 100)}%</span>
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)' }}>{it.time}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(it.key); }}
                            style={{
                              padding: '2px 6px',
                              fontSize: 11,
                              border: 'none',
                              borderRadius: 3,
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: 'var(--high)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.4)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ));
              })()}
            </div>
          </div>
        )}
      </header>

      {/* ---------- pages ---------- */}
      {view.page === 'ward' && (
        <WardGrid patients={patients} onOpen={openDetail} movedIds={movedIds} glowingIds={glowingIds} signalView={signalView} />
      )}
      {view.page === 'detail' && detailPatient && (
        <PatientDetail patient={detailPatient} archive={icu.archive} channels={icu.channels} bands={detailPatient?.bands || []} matchBands={icu.matchBands}
          shapOn={shapOn} onToggleShap={() => setShapOn(s => !s)} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ICUApp />);
