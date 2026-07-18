/**
 * api.js
 *
 * Thin wrapper around the FastAPI backend. Every backend call lives here
 * so components never construct fetch() calls or URLs themselves.
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
