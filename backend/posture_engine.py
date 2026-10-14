"""
posture_engine.py

Ergonomically sound posture-classification engine for VitalFrame.
Designed specifically for front-facing desk & laptop webcams (chest-up framing).

Detects:
  - Good Posture:    Spine neutral, head centered, shoulders level
  - Slouching:       Spine/torso collapsed, head sunken toward shoulders
  - Leaning Forward: Head/torso pitched forward towards the screen
  - Forward Head:    Chin/ears pushed forward relative to shoulder line
  - Shoulder Tilt:   Lateral shoulder height asymmetry
  - Head Tilt:       Lateral head tilt (ears uneven)

Supports baseline calibration against the user's individual upright posture,
with scientifically calibrated ergonomic defaults when uncalibrated.
"""

import math
import numpy as np


class Point:
    def __init__(self, x: float, y: float, z: float = 0.0, visibility: float = 1.0):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


def angle_between(a, b, c) -> float:
    """Returns the 2D angle at point b formed by a-b-c (degrees)."""
    ba = np.array([a.x - b.x, a.y - b.y])
    bc = np.array([c.x - b.x, c.y - b.y])
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba < 1e-6 or norm_bc < 1e-6:
        return 170.0
    cos_a = np.dot(ba, bc) / (norm_ba * norm_bc)
    return math.degrees(math.acos(np.clip(cos_a, -1.0, 1.0)))


class PostureClassifier:
    """
    Evaluates sitting posture from MediaPipe Pose landmarks in front-facing webcams.
    """

    TIPS = {
        "Good Posture":    "Great posture! Keep your chest open and shoulders relaxed.",
        "Slouching":       "Sit upright — lengthen your spine and support your lower back.",
        "Leaning Forward": "Ease back — keep your head aligned over your torso.",
        "Forward Head":    "Tuck your chin slightly — keep your ears over your shoulders.",
        "Shoulder Tilt":   "Level your shoulders — check your chair or armrest height.",
        "Head Tilt":       "Straighten your head — keep your gaze level with the display.",
    }

    _PRIORITY = [
        "Slouching",
        "Leaning Forward",
        "Forward Head",
        "Shoulder Tilt",
        "Head Tilt",
        "Good Posture",
    ]

    def __init__(self, thresholds: dict | None = None):
        # Default ergonomic thresholds for front-facing desktop webcams
        self.THRESHOLDS = {
            "shoulder_tilt_max":  0.038,  # y-difference between shoulders
            "head_tilt_max":      0.035,  # y-difference between ears
            "min_vertical_ratio": 0.56,   # (neck_length / shoulder_width) - below this is slouching
            "max_perspective":    0.285,  # (eye_dist / shoulder_width) - above this is craning forward
            "max_z_diff":         1.15,   # depth difference: shoulders_z - nose_z
            "spine_angle_min":    142.0,  # calculated spine degrees
            "visibility_min":     0.35,   # min confidence for head/shoulders
        }
        if thresholds:
            self.THRESHOLDS = {**self.THRESHOLDS, **thresholds}

    def classify(self, lm, mp_pose, baseline: dict | None = None) -> dict:
        """
        Classifies current frame's landmarks.
        If a baseline calibration dict is provided, classifies relative to the user's
        calibrated neutral posture; otherwise uses standard ergonomic thresholds.
        """
        try:
            ls   = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            rs   = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            le   = lm[mp_pose.PoseLandmark.LEFT_EAR]
            re   = lm[mp_pose.PoseLandmark.RIGHT_EAR]
            nose = lm[mp_pose.PoseLandmark.NOSE]
            leye = lm[mp_pose.PoseLandmark.LEFT_EYE]
            reye = lm[mp_pose.PoseLandmark.RIGHT_EYE]

            # ── 1. Check if upper body is in frame ───────────────────────────
            if not (ls.visibility > 0.35 or rs.visibility > 0.35):
                return self._no_detection()
            if not (nose.visibility > 0.35 or le.visibility > 0.35 or re.visibility > 0.35):
                return self._no_detection()

            # ── 2. Geometric Measurements in Front View ───────────────────────
            sh_width = abs(ls.x - rs.x)
            if sh_width < 0.10:
                sh_width = 0.40  # fallback safety guard

            # Shoulder tilt
            sh_tilt = abs(ls.y - rs.y)

            # Head tilt (using both ears and eyes for maximum stability)
            ear_tilt = abs(le.y - re.y) if le.visibility > 0.35 and re.visibility > 0.35 else 0.0
            eye_tilt = abs(leye.y - reye.y) if leye.visibility > 0.35 and reye.visibility > 0.35 else 0.0
            head_tilt = max(ear_tilt, eye_tilt)

            # Neck / torso vertical extension (ratio of neck length to shoulder width)
            mid_sh_y = (ls.y + rs.y) / 2.0
            neck_length = mid_sh_y - nose.y
            vertical_ratio = neck_length / sh_width

            # Perspective expansion (ratio of eye distance to shoulder width)
            eye_dist = abs(leye.x - reye.x) if leye.visibility > 0.35 and reye.visibility > 0.35 else (sh_width * 0.22)
            perspective = eye_dist / sh_width

            # Depth measurement (distance of nose in front of shoulder line)
            mid_sh_z = (ls.z + rs.z) / 2.0
            z_diff = mid_sh_z - nose.z

            # Calculate synthetic spine angle for visualization (180 = upright, lower = slouch)
            # Upright vertical ratio (~0.72) maps to ~168 degrees
            # Slouched vertical ratio (~0.48) maps to ~136 degrees
            clamped_ratio = max(0.40, min(0.85, vertical_ratio))
            spine_a = 110.0 + (clamped_ratio - 0.40) * (70.0 / 0.45)
            # Add shoulder tilt deflection
            spine_a = max(120.0, min(180.0, spine_a - (sh_tilt * 40.0)))

            # ── 3. Posture Evaluation ─────────────────────────────────────────
            triggered = []
            t = self.THRESHOLDS

            if baseline:
                # ── Calibrated Mode (Relative to User's Own Upright Posture) ───
                base_vr = baseline.get("vertical_ratio", 0.70)
                base_persp = baseline.get("perspective", 0.23)

                # Slouching: vertical neck length compressed by > 16% from baseline
                if vertical_ratio < (base_vr * 0.82):
                    triggered.append("Slouching")

                # Leaning Forward: head closer to screen by > 22%
                if perspective > (base_persp * 1.22):
                    triggered.append("Leaning Forward")

                # Forward Head: head/chin jutting forward relative to shoulders
                if z_diff > (baseline.get("z_diff", 0.90) + 0.22):
                    triggered.append("Forward Head")

                # Shoulder Tilt: deviation from baseline tilt
                if sh_tilt > max(0.040, baseline.get("sh_tilt", 0.01) + 0.032):
                    triggered.append("Shoulder Tilt")

                # Head Tilt: deviation from baseline tilt
                if head_tilt > max(0.035, baseline.get("head_tilt", 0.01) + 0.030):
                    triggered.append("Head Tilt")

            else:
                # ── Standard Ergonomic Defaults ──
                # 1. Shoulder Tilt: visibly uneven shoulders
                if sh_tilt > t["shoulder_tilt_max"]:
                    triggered.append("Shoulder Tilt")

                # 2. Head Tilt: visibly tilted head
                if head_tilt > t["head_tilt_max"]:
                    triggered.append("Head Tilt")

                # 3. Slouching: sunken neck / compressed upper torso
                if vertical_ratio < t["min_vertical_ratio"] or spine_a < t["spine_angle_min"]:
                    triggered.append("Slouching")

                # 4. Leaning Forward: craning whole body towards webcam
                if perspective > t["max_perspective"]:
                    triggered.append("Leaning Forward")

                # 5. Forward Head: chin/nose jutting forward ahead of shoulders
                if z_diff > t["max_z_diff"]:
                    triggered.append("Forward Head")

            # Resolve primary posture label
            posture = "Good Posture"
            for label in self._PRIORITY:
                if label in triggered:
                    posture = label
                    break

            return {
                "posture":       posture,
                "spine_angle":   round(spine_a, 1),
                "shoulder_tilt": round(sh_tilt, 3),
                "neck_angle":    round(z_diff, 3),
                "head_tilt":     round(head_tilt, 3),
                "tip":           self.TIPS.get(posture, ""),
                "issues":        triggered,
                "metrics": {
                    "vertical_ratio": round(vertical_ratio, 3),
                    "perspective":    round(perspective, 3),
                    "sh_tilt":        round(sh_tilt, 3),
                    "head_tilt":      round(head_tilt, 3),
                    "z_diff":         round(z_diff, 3),
                }
            }

        except Exception as e:
            return self._no_detection()

    def _no_detection(self) -> dict:
        return {
            "posture":       "No Pose Detected",
            "spine_angle":   0.0,
            "shoulder_tilt": 0.0,
            "neck_angle":    0.0,
            "head_tilt":     0.0,
            "tip":           "",
            "issues":        [],
        }
