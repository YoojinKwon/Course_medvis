/* ============================================================
   MedViz ICU — real data loader from waveform30.db via API
   window.ICU = async { patients, channels, shapBands, matchBands, archive, ... }
   ============================================================ */

// ML Service 백엔드 API 주소 (포트 5003에서 실행)
const ML_BASE = window.location.origin.includes(':3000')
  ? 'http://localhost:5003'
  : window.location.origin;

// 전역으로 노출 (다른 파일에서 참조 가능)
window.ML_BASE = ML_BASE;

// 6 patients selected by signal completeness (format: pXXXXXXXX for ml_service)
const PATIENT_IDS = [14629329, 13240081, 17973277, 19305085, 16662288, 15857793];

// Patient information mapping
const PATIENT_INFO = {
  14629329: { name: '페이커', sex: '남', age: 42 },
  13240081: { name: '제우스', sex: '남', age: 38 },
  17973277: { name: '구마유시', sex: '남', age: 55 },
  19305085: { name: '이원정', sex: '여', age: 48 },
  16662288: { name: '권유진', sex: '여', age: 35 },
  15857793: { name: '김주영', sex: '남', age: 45 },
};

// Risk calculation
const logistic = (z) => 1 / (1 + Math.exp(-z));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const riskOf = (p) => (p >= 0.6 ? 'HIGH' : p >= 0.35 ? 'MEDIUM' : 'LOW');

// Dummy room assignments for display
const ROOM_ASSIGN = [
  { floor: 5, room: '5층 502호' },
  { floor: 5, room: '5층 503호' },
  { floor: 4, room: '4층 401호' },
  { floor: 4, room: '4층 402호' },
  { floor: 3, room: '3층 301호' },
  { floor: 3, room: '3층 302호' },
];

// Channel definitions
const channels = [
  { key: 'hr',         label: 'HR',           color: '#f472b6', kind: 'hr',   shap: true },
  { key: 'spo2',       label: 'SpO₂',         color: '#46b7f0', kind: 'spo2', shap: true },
  { key: 'pulse_spo2', label: 'Pulse (SpO₂)', color: '#38bdf8', kind: 'wave' },
  { key: 'rr',         label: 'RR',           color: '#f59e0b', kind: 'wave' },
  { key: 'nbps',       label: 'NBPs',         color: '#a78bfa', kind: 'wave' },
  { key: 'nbpd',       label: 'NBPd',         color: '#4ade80', kind: 'wave' },
  { key: 'nbpm',       label: 'NBPm',         color: '#fbbf24', kind: 'wave' },
  { key: 'qt',         label: 'QT',           color: '#c084fc', kind: 'wave' },
  { key: 'qtc',        label: 'QTc',          color: '#22d3ee', kind: 'wave', shap: true },
];

const matchBands = [
  { start: 0.12, end: 0.22 }, { start: 0.40, end: 0.52 }, { start: 0.70, end: 0.82 },
];

const shapBands = [
  { start: 0.04, end: 0.12 }, { start: 0.17, end: 0.24 }, { start: 0.30, end: 0.38 },
  { start: 0.44, end: 0.52 }, { start: 0.58, end: 0.66 }, { start: 0.72, end: 0.80 },
  { start: 0.86, end: 0.95 },
];

// Archive populated from FAISS search (ml_service)
let archive = [];

// Parse discharge note to extract Chief Complaint and sex
function parseNote(text) {
  if (!text) return { cc: '정보 없음', sex: 'Unknown', age: null };

  // Extract sex
  const sexMatch = text.match(/Sex:\s*([MF])/i);
  const sex = sexMatch ? (sexMatch[1].toUpperCase() === 'M' ? '남' : '여') : 'Unknown';

  // Extract Chief Complaint
  const ccMatch = text.match(/Chief Complaint:\s*\n(.+?)(?=\n[A-Z]|\Z)/s);
  const cc = ccMatch ? ccMatch[1].trim().split('\n')[0].trim() : '정보 없음';

  // Extract age (typically "___yo" or a number)
  const ageMatch = text.match(/(\d+)\s*(?:yo|years?)/i);
  const age = ageMatch ? parseInt(ageMatch[1]) : null;

  return { cc, sex, age };
}

// Parse detailed clinical note structure
function parseDetailedNote(text, seed = 1) {
  try {
    if (!text) return { admission: null, discharge: null, service: null, allergies: [], results: null };

    // Generate random dates based on seed for consistency
    const randomAdmissionDays = Math.floor((seed * 12345) % 180) - 90; // -90 to +90 days
    const randomStayDays = Math.floor((seed * 54321) % 21) + 3; // 3-23 days stay

    // Extract Admission Date
    let admissionMatch = text.match(/Admission Date:\s*([^\n]+)/i);
    let admissionDate = admissionMatch ? admissionMatch[1].trim() : null;
    if (!admissionDate || admissionDate === '___') {
      const admission = new Date();
      admission.setDate(admission.getDate() + randomAdmissionDays);
      admissionDate = `${admission.getFullYear()}-${String(admission.getMonth() + 1).padStart(2, '0')}-${String(admission.getDate()).padStart(2, '0')}`;
    }

    // Extract Discharge Date
    let dischargeMatch = text.match(/Discharge Date:\s*([^\n]+)/i);
    let dischargeDate = dischargeMatch ? dischargeMatch[1].trim() : null;
    if (!dischargeDate || dischargeDate === '___') {
      const discharge = new Date(new Date(admissionDate).getTime() + randomStayDays * 24 * 60 * 60 * 1000);
      dischargeDate = `${discharge.getFullYear()}-${String(discharge.getMonth() + 1).padStart(2, '0')}-${String(discharge.getDate()).padStart(2, '0')}`;
    }

    // Extract Service
    const serviceMatch = text.match(/Service:\s*([^\n]+)/i);
    const service = serviceMatch ? serviceMatch[1].trim() : '정보 없음';

    // Extract Allergies
    const allergiesMatch = text.match(/Allergies:\s*([\s\S]*?)(?=\n[A-Z]|\nAttending:|\Z)/i);
    let allergies = [];
    if (allergiesMatch) {
      allergies = allergiesMatch[1]
        .split('\n')
        .map(a => a.trim())
        .filter(a => a && a !== 'NKDA' && a !== 'No known drug allergies')
        .slice(0, 5);
      if (allergies.length === 0) allergies = ['알려진 약물 알레르기 없음'];
    } else {
      allergies = ['알려진 약물 알레르기 없음'];
    }

    // Extract Labs and Imaging (Pertinent Results)
    const labsMatch = text.match(/Labs:\s*([\s\S]*?)(?=\n\n|Imaging:|$)/i);
    const imagingMatch = text.match(/Imaging:\s*([\s\S]*?)(?=\n\n|History|\Z)/i);

    let results = { labs: [], imaging: [] };
    if (labsMatch) {
      const labLines = labsMatch[1].split('\n').filter(l => l.trim());
      results.labs = labLines.slice(0, 8).map(l => l.replace(/^-\s*/, '').trim());
    }
    if (imagingMatch) {
      const imagingLines = imagingMatch[1].split('\n').filter(l => l.trim());
      results.imaging = imagingLines.slice(0, 5).map(l => l.replace(/^-\s*/, '').trim());
    }

    const parsed = { admission: admissionDate, discharge: dischargeDate, service, allergies, results };
    console.log('[ICU] Parsed note:', parsed);
    return parsed;
  } catch (err) {
    console.error('[ICU] Error parsing note:', err);
    return { admission: null, discharge: null, service: null, allergies: [], results: null };
  }
}

// Map channel labels from ml_service to waveformSeries keys
const channelLabelToKey = {
  'HR': 'hr',
  'SpO2': 'spo2',
  'Pulse (SpO2)': 'pulse_spo2',
  'RR': 'rr',
  'NBPs': 'nbps',
  'NBPd': 'nbpd',
  'NBPm': 'nbpm',
  'QT': 'qt',
  'QTc': 'qtc',
};

// Load real data from ml_service backend
async function loadICUData() {
  console.log('[ICU] Starting data load from', ML_BASE);
  try {
    const patients = [];

    for (let i = 0; i < PATIENT_IDS.length; i++) {
      const numericId = PATIENT_IDS[i];
      const sid = `p${numericId}`;  // Convert to ml_service format: "p14629329"
      const room = ROOM_ASSIGN[i];
      console.log(`[ICU] Loading patient ${sid}...`);

      try {
        // Fetch risk probability
        const riskResp = await fetch(`${ML_BASE}/api/ml/risk/${sid}`);
        if (!riskResp.ok) {
          console.warn(`[ICU] No risk data for patient ${sid}: ${riskResp.status}`);
          continue;
        }
        const riskData = await riskResp.json();
        const prob = riskData.risk_prob;
        const riskLevel = riskData.risk_level;
        console.log(`[ICU] Patient ${sid}: risk_prob=${prob}, risk_level=${riskLevel}`);

        // Fetch numerics (9 channels × 512 timesteps)
        const numericsResp = await fetch(`${ML_BASE}/api/ml/numerics/${sid}`);
        if (!numericsResp.ok) {
          console.warn(`[ICU] No numerics for patient ${sid}: ${numericsResp.status}`);
          continue;
        }
        const numericsData = await numericsResp.json();
        const chLabels = numericsData.channels || [];  // ["HR [bpm]", "SpO2 [%]", ...]
        const rawData = numericsData.data || [];  // [[...], [...], ...]
        console.log(`[ICU] Got numerics for patient ${sid}: ${chLabels.length} channels × ${rawData.length > 0 ? rawData[0].length : 0} steps`);

        // Map channels: parse label "HR [bpm]" → "HR" → "hr" key
        const waveformSeries = {};
        channels.forEach(ch => {
          waveformSeries[ch.key] = [];
        });

        console.log(`[ICU] Numerics labels: ${chLabels.join(', ')}`);
        console.log(`[ICU] Raw data shape: ${rawData.length} channels × ${rawData[0]?.length || 0} timesteps`);

        // Moderate downsample: keep every 4th point (512 → 128 points) for better visual fidelity
        const downsampleStep = 4;
        for (let chIdx = 0; chIdx < chLabels.length; chIdx++) {
          const label = chLabels[chIdx];
          const keyFromLabel = label.split(' [')[0].trim();  // "HR [bpm]" → "HR"
          const seriesKey = channelLabelToKey[keyFromLabel];
          if (seriesKey && rawData[chIdx]) {
            waveformSeries[seriesKey] = rawData[chIdx].filter((_, i) => i % downsampleStep === 0);
            console.log(`[ICU] Mapped ${label} (${keyFromLabel}) → ${seriesKey}: ${waveformSeries[seriesKey].length} points (downsampled)`);
          } else {
            console.warn(`[ICU] Could not map ${label}`);
          }
        }
        console.log(`[ICU] Final waveformSeries keys:`, Object.keys(waveformSeries));

        // Fetch SHAP-based importance bands for this patient
        let patientBands = [];
        try {
          const shapResp = await fetch(`${ML_BASE}/api/ml/shap/${sid}`);
          if (shapResp.ok) {
            const shapData = await shapResp.json();
            patientBands = shapData.bands || [];
            console.log(`[ICU] Got SHAP bands for patient ${sid}:`, patientBands);
          }
        } catch (err) {
          console.warn(`[ICU] Error fetching SHAP for ${sid}:`, err);
        }

        // Extract latest vitals (last value per channel)
        let latestHR = null, latestSpO2 = null, latestRR = null, latestBP = null;
        if (waveformSeries.hr && waveformSeries.hr.length > 0) {
          latestHR = waveformSeries.hr[waveformSeries.hr.length - 1];
        }
        if (waveformSeries.spo2 && waveformSeries.spo2.length > 0) {
          latestSpO2 = waveformSeries.spo2[waveformSeries.spo2.length - 1];
        }
        if (waveformSeries.rr && waveformSeries.rr.length > 0) {
          latestRR = waveformSeries.rr[waveformSeries.rr.length - 1];
        }
        if (waveformSeries.nbps && waveformSeries.nbps.length > 0 &&
            waveformSeries.nbpd && waveformSeries.nbpd.length > 0) {
          const nbps = waveformSeries.nbps[waveformSeries.nbps.length - 1];
          const nbpd = waveformSeries.nbpd[waveformSeries.nbpd.length - 1];
          latestBP = `${Math.round(nbps)}/${Math.round(nbpd)}`;
        }

        // Fetch FAISS-based similar cases from ml_service
        let patientArchive = [];
        try {
          const similarResp = await fetch(`${ML_BASE}/api/ml/similar/${sid}?top_k=5`);
          if (similarResp.ok) {
            const similarData = await similarResp.json();
            const results = similarData.results || [];
            console.log(`[ICU] Got ${results.length} similar cases for patient ${sid}`);

            // Convert ml_service format to archive format
            // NOTE: waveformSeries will be lazy-loaded when user clicks on the card
            patientArchive = results.map(result => ({
              id: result.id,
              patient_id: result.patient_id,
              name: `유사환자 ${result.patient_id.substring(1)}`,
              sex: '미공개',
              age: '미공개',
              height: 170,
              similarity: result.similarity_score,
              risk: result.risk_level,
              morph: 'unknown',
              event: false,
              los: 0,
              dx: 'MIMIC-IV',
              icd: '',
              admit: '',
              discharge: null,
              reason: `유사도 ${(result.similarity_score * 100).toFixed(1)}%`,
              meds: [],
              summary: result.note || `Window ${result.window_idx}, Risk: ${result.risk_level}`,
              events: [],
              window_idx: result.window_idx,
              risk_prob: result.risk_prob,
              waveformSeries: {},  // Will be lazy-loaded on click
              highlight_region: result.highlight_region || { start: 0.5, end: 1.0 },  // SHAP-based
              parsedNote: {
                admission: '2024-06-01',
                discharge: '2024-06-10',
                service: 'Intensive Care Unit',
                allergies: result.clinical_notes?.allergies || [],
                discharge_diagnosis: result.clinical_notes?.diagnosis || [],
                discharge_condition: result.clinical_notes?.discharge_status || '',
                hospital_course: result.clinical_notes?.hospital_course || '',
                discharge_medications: result.clinical_notes?.medications || [],
                followup_instructions: result.clinical_notes?.followup || '',
                results: {
                  labs: [
                    `유사도: ${(result.similarity_score * 100).toFixed(1)}%`,
                    `위험도: ${result.risk_level}`,
                    `위험 확률: ${(result.risk_prob * 100).toFixed(1)}%`,
                    `윈도우 번호: #${result.window_idx}`,
                    `데이터소스: MIMIC-IV (사실 레이블: ${result.label})`
                  ],
                  imaging: [
                    `쿼리 환자와 신호 패턴 유사`,
                    `ML 기반 코사인 유사도 검색 (FAISS)`,
                    `위험도 분류: ${result.risk_level}`
                  ]
                }
              },
            }));

            // Add to global archive for detail view
            archive.push(...patientArchive);
          } else {
            console.warn(`[ICU] No similar cases for patient ${sid}`);
          }
        } catch (err) {
          console.warn(`[ICU] Error fetching similar cases for ${sid}:`, err);
        }

        // Infer morphology from risk seed (same logic as before for animation)
        const morph = ['normal', 'vt', 'af', 'pvc'][Math.floor(numericId / 1000) % 4];

        const info = PATIENT_INFO[numericId] || { name: '환자', sex: '미공개', age: '미공개' };
        const patient = {
          id: sid,
          subject_id: numericId,
          name: `${info.name} (${numericId})`,
          sex: info.sex,
          age: info.age,
          height: 170,  // dummy
          room: room.room,
          floor: room.floor,
          dx: 'ICU 모니터링',
          admit: 'MIMIC-IV',
          discharge: null,
          meds: [],  // ml_service에서 제공 안 함
          prob: 0.5,  // Start at 50% for initial alerts, will update as model runs
          drift: 0.01,
          vol: 0.05,
          morph: morph,
          seed: numericId % 100,
          hr: latestHR ? Math.round(latestHR) : 80,
          spo2: latestSpO2 ? Math.round(latestSpO2) : 95,
          bp: latestBP || '120/80',
          rr: latestRR ? Math.round(latestRR) : 18,
          note: `환자 ${numericId}의 MIMIC-IV 모니터링 데이터. 위험도: ${riskLevel}. 최근 바이탈: HR ${latestHR ? Math.round(latestHR) : 80} bpm, SpO2 ${latestSpO2 ? Math.round(latestSpO2) : 95}%, RR ${latestRR ? Math.round(latestRR) : 18}/min. ML 모델 기반 분석.`,
          parsedNote: {
            admission: '2024-06-01',
            discharge: '2024-06-10',
            service: 'Intensive Care Unit',
            allergies: riskData.clinical_notes?.allergies || [],
            hospital_course: riskData.clinical_notes?.hospital_course || '',
            discharge_diagnosis: riskData.clinical_notes?.diagnosis || [],
            discharge_condition: riskData.clinical_notes?.discharge_status || '',
            discharge_medications: riskData.clinical_notes?.medications || [],
            followup_instructions: riskData.clinical_notes?.followup || '',
            results: {
              labs: [
                'HR (Heart Rate): ' + (latestHR ? Math.round(latestHR) : 80) + ' bpm',
                'SpO2 (Oxygen Saturation): ' + (latestSpO2 ? Math.round(latestSpO2) : 95) + '%',
                'RR (Respiratory Rate): ' + (latestRR ? Math.round(latestRR) : 18) + '/min',
                'BP (Blood Pressure): ' + (latestBP || '120/80'),
                'Risk Level: ' + riskLevel,
                'Risk Probability: ' + (prob * 100).toFixed(1) + '%'
              ],
              imaging: [
                '12-lead ECG 모니터링 중',
                'Continuous waveform monitoring (MIMIC-IV)',
                'ML-based risk assessment active'
              ]
            }
          },
          events: [],
          waveformSeries: waveformSeries,
          bands: patientBands,  // SHAP-based importance bands from /api/ml/shap
        };

        patients.push(patient);
      } catch (err) {
        console.error(`[ICU] Error loading patient ${sid}:`, err);
      }
    }

    console.log(`[ICU] Successfully loaded ${patients.length} patients`);
    window.ICU = {
      patients,
      channels,
      shapBands,
      matchBands,
      archive,
      logistic,
      clamp,
      riskOf,
    };
    window.ICU_LOADED = true;
    console.log('[ICU] window.ICU_LOADED = true');

    return window.ICU;
  } catch (err) {
    console.error('[ICU] Failed to load ICU data:', err);
    throw err;
  }
}

// Auto-load on script execution
if (typeof window !== 'undefined') {
  console.log('[ICU] icudata.js loaded, starting async load...');
  loadICUData().catch(err => {
    console.error('[ICU] data loading error:', err);
    // Fallback to empty structure
    window.ICU = { patients: [], channels, shapBands, matchBands, archive, logistic, clamp, riskOf };
  });
}
