const ML_BASE = 'http://localhost:5003/api/ml';

async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const mlService = {
  /**
   * GET /api/ml/risk/<subject_id>
   * Returns { risk_prob, risk_level, window_idx, label }
   */
  getRisk(subjectId, windowRank = null) {
    const url = windowRank !== null
      ? `${ML_BASE}/risk/${subjectId}?window_rank=${windowRank}`
      : `${ML_BASE}/risk/${subjectId}`;
    return safeFetch(url);
  },

  /**
   * GET /api/ml/similar/<subject_id>?top_k=<n>
   * Returns array of signal objects compatible with SimilarSignalsList
   */
  async getSimilar(subjectId, topK = 5) {
    const data = await safeFetch(`${ML_BASE}/similar/${subjectId}?top_k=${topK}`);
    return data?.results ?? [];
  },

  /**
   * GET /api/ml/shap/<subject_id>?window_idx=<n>
   * Returns { channels, values (17x16), ch_importance, patch_importance, vmax }
   */
  getShap(subjectId, windowIdx = null) {
    const url = windowIdx != null
      ? `${ML_BASE}/shap/${subjectId}?window_idx=${windowIdx}`
      : `${ML_BASE}/shap/${subjectId}`;
    return safeFetch(url);
  },

  /**
   * GET /api/ml/patients
   * Returns all patients with risk sorted descending
   */
  async getPatients() {
    const data = await safeFetch(`${ML_BASE}/patients`);
    return data?.patients ?? [];
  },

  /**
   * GET /api/ml/numerics/<subject_id>
   * Returns 17-channel window data for highest-risk window
   */
  getNumerics(subjectId) {
    return safeFetch(`${ML_BASE}/numerics/${subjectId}`);
  },

  /**
   * GET /api/ml/health
   */
  health() {
    return safeFetch(`${ML_BASE}/health`);
  },
};
