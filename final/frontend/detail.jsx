/* ============================================================
   MedViz ICU — Page 2: single-patient detail
   - 9 channels + SHAP risk bands
   - expandable detailed clinical note
   - similar patients expand INLINE (no page change) with matched-pattern bands
   ============================================================ */
function ChannelRow({ ch, seed, shapOn, bands, series }) {
  return (
    <div className="chan-row">
      <div className="chan-label" style={{ color: ch.color }}>{ch.label}</div>
      <div className="chan-plot">
        {shapOn && ch.shap && bands.map((b, i) => (
          <div key={i} className="shap-band" style={{ left: `${b.start * 100}%`, width: `${(b.end - b.start) * 100}%` }} />
        ))}
        <TrendWave kind={ch.kind} seed={seed + ch.key.length} color={ch.color}
          amp={ch.kind === 'spo2' ? 0.32 : 0.36} baseline={ch.kind === 'spo2' ? 0.4 : 0.5}
          lineWidth={1.4} animated={true} speed={60} series={series} />
      </div>
    </div>
  );
}

/* inline expansion shown under a selected similar patient */
function ArchiveExpand({ a, channels, matchBands }) {
  const chById = useMemo(() => Object.fromEntries(channels.map(c => [c.key, c])), [channels]);
  const seriesKeys = ['hr', 'pulse_spo2', 'spo2'];
  const [noteOpen, setNoteOpen] = useState(false);
  const [waveforms, setWaveforms] = useState(a.waveformSeries || {});
  const [loadingWaveforms, setLoadingWaveforms] = useState(Object.keys(a.waveformSeries || {}).length === 0);
  const [parsedNote, setParsedNote] = useState(a.parsedNote);

  // Lazy load waveforms when component mounts or when expanded
  useEffect(() => {
    if (Object.keys(waveforms).length > 0 || !loadingWaveforms) return;  // Already loaded

    const loadWaveforms = async () => {
      try {
        const resp = await fetch(`${window.ML_BASE}/api/ml/numerics/${a.patient_id}`);
        if (resp.ok) {
          const data = await resp.json();
          const chLabels = data.channels || [];
          const rawData = data.data || [];

          // Map channels and downsample (16x)
          const channelLabelToKey = {
            'HR': 'hr', 'SpO2': 'spo2', 'Pulse (SpO2)': 'pulse_spo2',
            'RR': 'rr', 'NBPs': 'nbps', 'NBPd': 'nbpd', 'NBPm': 'nbpm',
            'QT': 'qt', 'QTc': 'qtc',
          };

          const newWaveforms = {};
          const latestValues = {};

          for (let chIdx = 0; chIdx < chLabels.length; chIdx++) {
            const label = chLabels[chIdx];
            const keyFromLabel = label.split(' [')[0].trim();
            const seriesKey = channelLabelToKey[keyFromLabel];
            if (seriesKey && rawData[chIdx]) {
              newWaveforms[seriesKey] = rawData[chIdx].filter((_, i) => i % 4 === 0);
              // Store latest value (last point) for vitals
              if (rawData[chIdx].length > 0) {
                latestValues[keyFromLabel] = rawData[chIdx][rawData[chIdx].length - 1];
              }
            }
          }

          // Denormalize functions (from -1~1 to actual ranges)
          const denormalizeHR = (v) => (v + 1) / 2 * 120 + 40;           // -1~1 → 40~160
          const denormalizeSpo2 = (v) => (v + 1) / 2 * 20 + 80;          // -1~1 → 80~100
          const denormalizeRR = (v) => (v + 1) / 2 * 40 + 6;             // -1~1 → 6~46
          const denormalizeBPs = (v) => (v + 1) / 2 * 90 + 90;           // -1~1 → 90~180
          const denormalizeBPd = (v) => (v + 1) / 2 * 70 + 50;           // -1~1 → 50~120

          // Update parsedNote with actual vitals
          const updatedNote = { ...parsedNote };
          if (updatedNote.results) {
            updatedNote.results.labs = [
              `HR (Heart Rate): ${latestValues.HR ? Math.round(denormalizeHR(latestValues.HR)) : '?'} bpm`,
              `SpO2 (Oxygen Saturation): ${latestValues.SpO2 ? Math.round(denormalizeSpo2(latestValues.SpO2)) : '?'}%`,
              `RR (Respiratory Rate): ${latestValues.RR ? Math.round(denormalizeRR(latestValues.RR)) : '?'}/min`,
              `BP (Blood Pressure): ${latestValues.NBPs ? Math.round(denormalizeBPs(latestValues.NBPs)) : '?'}/${latestValues.NBPd ? Math.round(denormalizeBPd(latestValues.NBPd)) : '?'}`,
              `Risk Level: ${a.risk}`,
              `Risk Probability: ${(a.risk_prob * 100).toFixed(1)}%`
            ];
          }

          setWaveforms(newWaveforms);
          setParsedNote(updatedNote);
          console.log(`[ArchiveExpand] Loaded waveforms and vitals for ${a.patient_id}`);
        }
      } catch (err) {
        console.error(`[ArchiveExpand] Error loading waveforms:`, err);
      } finally {
        setLoadingWaveforms(false);
      }
    };

    loadWaveforms();
  }, [a.patient_id, waveforms, loadingWaveforms]);

  return (
    <div className="sim-expand">
      <div className="sim-sect-t">보관 시계열 · 유사 패턴 구간</div>
      <div className="sim-series">
        {seriesKeys.map((key, i) => {
          const ch = chById[key];
          return (
            <div className="srow2" key={key}>
              <span className="slabel2" style={{ color: ch.color }}>{ch.label}</span>
              {a.highlight_region && (
                <div className="match-band" style={{ left: `${a.highlight_region.start * 100}%`, width: `${(a.highlight_region.end - a.highlight_region.start) * 100}%` }} />
              )}
              {loadingWaveforms ? (
                <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
                  로딩 중...
                </div>
              ) : (
                <TrendWave kind={ch.kind} seed={a.age + i * 9} color={ch.color}
                  amp={ch.kind === 'spo2' ? 0.3 : 0.36} baseline={ch.kind === 'spo2' ? 0.42 : 0.5}
                  lineWidth={1.4} animated={false} glow series={waveforms[key]} />
              )}
            </div>
          );
        })}
      </div>
      <div className="match-legend"><span className="dot-blue" /> 쿼리 환자와 일치하는 패턴 추출 구간</div>

      <div className="sim-sect-t">개인 정보 · 입원 요인</div>
      <div className="kv2">
        <span className="k">성별 / 나이</span><span className="v">{a.sex} · {a.age}세</span>
        <span className="k">키</span><span className="v">{a.height} cm</span>
        <span className="k">진단명</span><span className="v">{a.dx}</span>
        <span className="k">ICD</span><span className="v" style={{ fontFamily: 'var(--mono)' }}>{a.icd}</span>
        <span className="k">입원 / 퇴원</span><span className="v" style={{ fontFamily: 'var(--mono)' }}>{a.admit} → {a.discharge}</span>
        <span className="k">재원일</span><span className="v">{a.los}일</span>
        <span className="k">입원 요인</span><span className="v">{a.reason}</span>
      </div>

      <div className="sim-sect-t">처방 기록</div>
      <div className="sim-meds">{a.meds.map((m, i) => <span className="m" key={i}>{m}</span>)}</div>

      {a.events.length > 0 && (<>
        <div className="sim-sect-t">발생 이벤트</div>
        <div className="timeline">
          {a.events.map((e, i) => (<div className="tl-item" key={i}><span className="tl-t">{e.t}</span><span className="tl-l">{e.label}</span></div>))}
        </div>
      </>)}

      <div className="note-wrap">
        <button className={`note-btn ${noteOpen ? 'on' : ''}`} onClick={() => setNoteOpen(o => !o)}>
          <Ic k="doc" s={14} /> 퇴원 요약지 {noteOpen ? '닫기' : '보기'}
          <span className={`note-chev ${noteOpen ? 'open' : ''}`}><Ic k="chev" s={14} /></span>
        </button>
        {noteOpen && (
          <div className="note-panel">
            {parsedNote ? (
              <>
          <div className="note-section">
            <div className="note-section-title">입원 정보</div>
            <div className="note-kv-grid">
              <div className="note-kv">
                <span className="k">입원일</span>
                <span className="v">{parsedNote.admission || '-'}</span>
              </div>
              <div className="note-kv">
                <span className="k">퇴원일</span>
                <span className="v">{parsedNote.discharge || '-'}</span>
              </div>
            </div>
          </div>

          <div className="note-section">
            <div className="note-section-title">진료과</div>
            <div className="note-value">{parsedNote.service || '정보 없음'}</div>
          </div>

          {parsedNote.allergies && parsedNote.allergies.length > 0 && (
            <div className="note-section">
              <div className="note-section-title">알레르기</div>
              <div className="note-bullets">
                {parsedNote.allergies.map((allergy, i) => (
                  <div key={i} className="bullet">• {allergy}</div>
                ))}
              </div>
            </div>
          )}

          {parsedNote.discharge_diagnosis && parsedNote.discharge_diagnosis.length > 0 && (
            <div className="note-section">
              <div className="note-section-title">퇴원 진단</div>
              <div className="note-bullets">
                {parsedNote.discharge_diagnosis.map((diag, i) => (
                  <div key={i} className="bullet">• {diag}</div>
                ))}
              </div>
            </div>
          )}

          {parsedNote.discharge_condition && (
            <div className="note-section">
              <div className="note-section-title">퇴원 시점 상태</div>
              <div className="note-value">{parsedNote.discharge_condition}</div>
            </div>
          )}

          {parsedNote.hospital_course && (
            <div className="note-section">
              <div className="note-section-title">입원 경과</div>
              <div className="note-value">{parsedNote.hospital_course}</div>
            </div>
          )}

          {parsedNote.discharge_medications && parsedNote.discharge_medications.length > 0 && (
            <div className="note-section">
              <div className="note-section-title">퇴원 약물</div>
              <div className="note-bullets">
                {parsedNote.discharge_medications.map((med, i) => (
                  <div key={i} className="bullet">• {med}</div>
                ))}
              </div>
            </div>
          )}

          {parsedNote.followup_instructions && (
            <div className="note-section">
              <div className="note-section-title">추후 관찰</div>
              <div className="note-value">{parsedNote.followup_instructions}</div>
            </div>
          )}

          {parsedNote.results && (parsedNote.results.labs.length > 0 || parsedNote.results.imaging.length > 0) && (
            <div className="note-section">
              <div className="note-section-title">검사 결과</div>
              {parsedNote.results.labs.length > 0 && (
                <div className="note-subsection">
                  <div className="note-subsection-title">검혈/생화학</div>
                  <div className="note-bullets">
                    {parsedNote.results.labs.map((lab, i) => (
                      <div key={i} className="bullet">{lab}</div>
                    ))}
                  </div>
                </div>
              )}
              {parsedNote.results.imaging.length > 0 && (
                <div className="note-subsection">
                  <div className="note-subsection-title">영상 검사</div>
                  <div className="note-bullets">
                    {parsedNote.results.imaging.map((img, i) => (
                      <div key={i} className="bullet">{img}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
              </>
            ) : (
              <div className="doc">{a.summary}</div>
            )}
            </div>
        )}
      </div>
    </div>
  );
}

function PatientDetail({ patient, archive, channels, bands, matchBands, shapOn }) {
  const [sortBy, setSortBy] = useState('similarity');  // 'similarity' or 'risk'
  const sims = useMemo(() => {
    const sorted = [...archive];
    if (sortBy === 'risk') {
      // Sort by risk probability (descending)
      return sorted.sort((a, b) => b.risk_prob - a.risk_prob);
    } else {
      // Sort by similarity (descending)
      return sorted.sort((a, b) => b.similarity - a.similarity);
    }
  }, [archive, sortBy]);
  const [expandedSim, setExpandedSim] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [sideWidth, setSideWidth] = useState(450);  // 기본 너비
  const [isResizing, setIsResizing] = useState(false);
  const pct = (patient.prob * 100).toFixed(1);

  // 리사이즈 핸들
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX));
      setSideWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [isResizing]);

  // Debug log
  useEffect(() => {
    console.log('PatientDetail patient:', patient);
    console.log('PatientDetail parsedNote:', patient.parsedNote);
  }, [patient]);

  return (
    <div className="detail" style={{ display: 'flex', height: '100%' }}>
      {/* main: 9-channel series */}
      <div className="detail-main scroll" style={{ flex: 1, minWidth: 0 }}>
        <div className="detail-mainhead">
          <h2>9채널 생체신호</h2>
          {shapOn && <span className="dm-badge">SHAP 표시 중 (위험 기여 구간)</span>}
          <span className="dm-meta">8.7분 윈도우 · Risk {Math.round(patient.prob * 100)}%</span>
        </div>
        <div className="chan-list">
          {channels.map((ch) => (
            <ChannelRow key={ch.key} ch={ch} seed={patient.seed} shapOn={shapOn} bands={bands} series={patient.waveformSeries?.[ch.key]} />
          ))}
        </div>
      </div>

      {/* resize handle */}
      <div
        style={{
          width: 4,
          backgroundColor: 'var(--border)',
          cursor: 'col-resize',
          userSelect: 'none',
          transition: isResizing ? 'none' : 'background-color 0.2s',
        }}
        onMouseDown={() => setIsResizing(true)}
        onMouseOver={(e) => !isResizing && (e.target.style.backgroundColor = '#666')}
        onMouseOut={(e) => !isResizing && (e.target.style.backgroundColor = 'var(--border)')}
      />

      {/* side: patient info + similar patients */}
      <div className="detail-side scroll" style={{ width: `${sideWidth}px`, flexShrink: 0 }}>
        <div className="side-sect" style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg)', zIndex: 10, paddingBottom: 16 }}>
          <div className="side-title">환자 정보</div>
          <div className="info-rows">
            <div className="inforow"><span className="k">환자 ID</span><span className="v">{patient.id}</span></div>
            <div className="inforow"><span className="k">위험도</span><span className="v high">{patient.risk} ({pct}%)</span></div>
            <div className="inforow"><span className="k">이름 / 성별</span><span className="v">{patient.name} · {patient.sex}</span></div>
            <div className="inforow"><span className="k">나이 / 키</span><span className="v">{patient.age}세 · {patient.height}cm</span></div>
            <div className="inforow"><span className="k">병명</span><span className="v" style={{ fontFamily: 'var(--font)' }}>{patient.dx}</span></div>
            <div className="inforow"><span className="k">실제 레이블</span><span className="v">이상 이벤트 ({patient.events.length})</span></div>
            <div className="inforow"><span className="k">모델</span><span className="v">Linear + LogisticRegression</span></div>
          </div>
          <div className="note-wrap">
            <button className={`note-btn ${noteOpen ? 'on' : ''}`} onClick={() => setNoteOpen(o => !o)}>
              <Ic k="doc" s={14} /> 상세 임상 노트 {noteOpen ? '닫기' : '보기'}
              <span className={`note-chev ${noteOpen ? 'open' : ''}`}><Ic k="chev" s={14} /></span>
            </button>
            {noteOpen && (
              <div className="note-panel">
                {patient.parsedNote ? (
                  <>
                    <div className="note-section">
                      <div className="note-section-title">입원 정보</div>
                      <div className="note-kv-grid">
                        <div className="note-kv">
                          <span className="k">입원일</span>
                          <span className="v">{patient.parsedNote.admission || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="note-section">
                      <div className="note-section-title">진료과</div>
                      <div className="note-value">{patient.parsedNote.service || '정보 없음'}</div>
                    </div>

                    <div className="note-section">
                      <div className="note-section-title">알레르기</div>
                      <div className="note-bullets">
                        {(patient.parsedNote.allergies || []).map((allergy, i) => (
                          <div key={i} className="bullet">• {allergy}</div>
                        ))}
                      </div>
                    </div>

                    {patient.parsedNote.hospital_course && (
                      <div className="note-section">
                        <div className="note-section-title">입원 경과</div>
                        <div className="note-value">{patient.parsedNote.hospital_course}</div>
                      </div>
                    )}

                    {patient.parsedNote.results && (patient.parsedNote.results.labs.length > 0 || patient.parsedNote.results.imaging.length > 0) && (
                      <div className="note-section">
                        <div className="note-section-title">검사 결과</div>
                        {patient.parsedNote.results.labs.length > 0 && (
                          <div className="note-subsection">
                            <div className="note-subsection-title">검혈/생화학</div>
                            <div className="note-bullets">
                              {patient.parsedNote.results.labs.map((lab, i) => (
                                <div key={i} className="bullet">{lab}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {patient.parsedNote.results.imaging.length > 0 && (
                          <div className="note-subsection">
                            <div className="note-subsection-title">영상 검사</div>
                            <div className="note-bullets">
                              {patient.parsedNote.results.imaging.map((img, i) => (
                                <div key={i} className="bullet">{img}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>
                    임상노트 데이터를 불러오는 중입니다...
                  </div>
                )}

                {patient.events && patient.events.length > 0 && (
                  <div className="note-section">
                    <div className="note-section-title">최근 이벤트</div>
                    <div className="timeline">
                      {patient.events.map((e, i) => (<div className="tl-item" key={i}><span className="tl-t">{e.t}</span><span className="tl-l">{e.label}</span></div>))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="side-sect">
          <div className="side-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>유사 신호 환자</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSortBy('similarity')}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: sortBy === 'similarity' ? 'var(--accent)' : 'var(--surface)',
                  color: sortBy === 'similarity' ? 'white' : 'var(--text)',
                  fontWeight: sortBy === 'similarity' ? 600 : 400,
                }}
              >
                유사도순
              </button>
              <button
                onClick={() => setSortBy('risk')}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: sortBy === 'risk' ? 'var(--accent)' : 'var(--surface)',
                  color: sortBy === 'risk' ? 'white' : 'var(--text)',
                  fontWeight: sortBy === 'risk' ? 600 : 400,
                }}
              >
                위험도순
              </button>
            </div>
          </div>
          <div className="sim-list">
            {sims.map((s) => {
              const open = expandedSim === s.id;
              return (
                <div className="sim-item-wrap" key={s.id}>
                  <div className={`simrow ${open ? 'open' : ''}`} onClick={() => setExpandedSim(open ? null : s.id)}>
                    <div className="simrow-top">
                      <span className="simrow-pid">{s.id}</span>
                      <RiskPill level={s.risk} />
                      <span className="simrow-sim">유사도 {(s.similarity * 100).toFixed(1)}%</span>
                      <span className={`note-chev ${open ? 'open' : ''}`} style={{ marginLeft: 6 }}><Ic k="chev" s={15} /></span>
                    </div>
                    <div className="simrow-sub">
                      <span>{s.sex} · {s.age}세 · {s.dx}</span>
                      {s.event && <span className="event-tag">이상 이벤트 발생</span>}
                    </div>
                  </div>
                  {open && <ArchiveExpand a={s} channels={channels} matchBands={matchBands} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PatientDetail });
