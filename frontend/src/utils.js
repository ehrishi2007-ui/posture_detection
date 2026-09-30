/**
 * Maps a posture label from the backend to a visual severity tier.
 * Kept in one place so color/status logic never drifts between components.
 *
 * v2: Added Forward Head and Head Tilt labels.
 */
export function statusForPosture(posture) {
  if (posture === "Good Posture")    return "good";
  if (posture === "Shoulder Tilt")   return "warn";
  if (posture === "Head Tilt")       return "warn";
  if (posture === "Slouching")       return "bad";
  if (posture === "Leaning Forward") return "bad";
  if (posture === "Forward Head")    return "bad";
  return "neutral"; // "No Pose Detected" or unknown
}

export function scoreColor(score) {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

/**
 * Human-readable short label for each posture type.
 * Used in charts and breakdown lists.
 */
export function postureShortLabel(posture) {
  const map = {
    "Good Posture":    "Good",
    "Slouching":       "Slouching",
    "Leaning Forward": "Leaning Fwd",
    "Forward Head":    "Fwd Head",
    "Shoulder Tilt":   "Shoulder",
    "Head Tilt":       "Head Tilt",
    "No Pose Detected":"No Pose",
  };
  return map[posture] ?? posture;
}

/**
 * Color hex for each posture label — used in Recharts.
 * Returns a hex string directly so Recharts can consume it.
 */
export function postureColor(posture) {
  const map = {
    "Good Posture":    "#5FBFA3",
    "Slouching":       "#D64550",
    "Leaning Forward": "#C85A2A",
    "Forward Head":    "#E07050",
    "Shoulder Tilt":   "#E3A857",
    "Head Tilt":       "#A0859E",
    "No Pose Detected":"#6B7280",
  };
  return map[posture] ?? "#6B7280";
}
