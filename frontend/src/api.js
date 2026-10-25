/**
 * api.js
 *
 * Thin wrapper around the VitalFrame FastAPI backend.
 * Every backend call lives here so components never construct
 * fetch() calls or URLs themselves.
 *
 * v2: Added getStatsSummary() for dashboard analytics.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new Error(detail);
  }
  return res.json();
}

/** Sends one webcam frame (as a Blob) for analysis. */
export async function analyzeFrame(sessionId, blob) {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");

  const res = await fetch(
    `${BASE_URL}/analyze?session_id=${encodeURIComponent(sessionId)}`,
    { method: "POST", body: form }
  );
  return handleResponse(res);
}

/** Sends the user's camera hardware type and physical desk position. */
export async function configureCameraSetup(sessionId, cameraType, position) {
  const res = await fetch(
    `${BASE_URL}/setup/${encodeURIComponent(sessionId)}?camera_type=${encodeURIComponent(cameraType)}&position=${encodeURIComponent(position)}`,
    { method: "POST" }
  );
  return handleResponse(res);
}

/** Configures sustained bad posture duration in seconds before alert fires. */
export async function setAlertThreshold(sessionId, seconds) {
  const res = await fetch(
    `${BASE_URL}/settings/alert_threshold/${encodeURIComponent(sessionId)}?seconds=${encodeURIComponent(seconds)}`,
    { method: "POST" }
  );
  return handleResponse(res);
}

/** Calibrates the user's neutral upright posture baseline. */
export async function calibratePosture(sessionId, blob) {
  const form = new FormData();
  form.append("file", blob, "frame.jpg");

  const res = await fetch(
    `${BASE_URL}/calibrate/${encodeURIComponent(sessionId)}`,
    { method: "POST", body: form }
  );
  return handleResponse(res);
}

/** Ends the session and requests a Gemini-generated coaching report. */
export async function getCoachReport(sessionId) {
  const res = await fetch(
    `${BASE_URL}/coach/${encodeURIComponent(sessionId)}`,
    { method: "POST" }
  );
  return handleResponse(res);
}

/** Fetches recent saved sessions for the history view. */
export async function getSessions(limit = 50) {
  const res = await fetch(`${BASE_URL}/sessions?limit=${limit}`);
  return handleResponse(res);
}

/** Fetches a single session record by numeric ID. */
export async function getSession(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`);
  return handleResponse(res);
}

/**
 * Fetches aggregated analytics for the dashboard.
 * @param {number} days - Number of days for the trend chart (default 7)
 */
export async function getStatsSummary(days = 7) {
  const res = await fetch(`${BASE_URL}/stats/summary?days=${days}`);
  return handleResponse(res);
}

/** Health check — used by Electron to confirm the backend is ready. */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return handleResponse(res);
}
