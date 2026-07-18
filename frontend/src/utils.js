/**
 * Maps a posture label from the backend to a visual severity tier.
 * Kept in one place so color/status logic never drifts between components.
 */
export function statusForPosture(posture) {
  if (posture === "Good Posture") return "good";
  if (posture === "Shoulder Tilt") return "warn";
  if (posture === "Slouching" || posture === "Leaning Forward") return "bad";
  return "neutral"; // "No Pose Detected" or unknown
}

export function scoreColor(score) {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}
