"""
posture_engine.py

Pure posture-classification logic — no UI, no OpenCV windows, no Tkinter.
Takes MediaPipe pose landmarks in, returns a posture label + angle data out.
This module is shared by any interface: FastAPI backend, Streamlit UI,
CLI tools, tests, etc.
"""

import math
import numpy as np


# ─── Geometry helper ─────────────────────────────────────────────────────────


def angle_between(a, b, c) -> float:
    """
    Returns the angle at point b (in degrees), formed by points a-b-c.
    a, b, c are MediaPipe landmark objects with .x and .y attributes.
    """
    ba = np.array([a.x - b.x, a.y - b.y])
    bc = np.array([c.x - b.x, c.y - b.y])
    cos_a = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cos_a, -1, 1)))


# ─── Classifier ───────────────────────────────────────────────────────────────


class PostureClassifier:
    """
    Detects 3 bad posture types from a single frame's landmarks:
      Slouching       — spine angle below threshold
      Leaning Forward — nose too far forward of shoulder
      Shoulder Tilt   — shoulders not level

    Stateless — call classify() once per frame. Any temporal smoothing
    (e.g. majority vote over N frames) is the caller's responsibility,
    since that depends on how the caller manages frame history
    (a live buffer for a desktop app vs. per-request state for an API).
    """

    THRESHOLDS = {
        "spine_angle_min": 145,  # degrees
        "shoulder_tilt_max": 0.05,  # normalised y-diff
        "lean_forward_max": 0.09,  # normalised x-offset
    }

    TIPS = {
        "Good Posture": "Great! Keep it up.",
        "Slouching": "Sit upright — support your lower back",
        "Shoulder Tilt": "Level your shoulders — check your chair",
        "Leaning Forward": "Ease back — keep your spine neutral",
    }

    def classify(self, lm, mp_pose) -> dict:
        """
        lm       : res.pose_landmarks.landmark from MediaPipe
        mp_pose  : the mp.solutions.pose module (for landmark enum access)

        Returns:
            {
                "posture": str,
                "spine_angle": float,
                "shoulder_tilt": float,
                "tip": str
            }
        """
        try:
            ls = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            rs = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            le = lm[mp_pose.PoseLandmark.LEFT_EAR]
            re = lm[mp_pose.PoseLandmark.RIGHT_EAR]
            lh = lm[mp_pose.PoseLandmark.LEFT_HIP]
            rh = lm[mp_pose.PoseLandmark.RIGHT_HIP]
            nose = lm[mp_pose.PoseLandmark.NOSE]

            if ls.visibility >= rs.visibility:
                shoulder, ear, hip = ls, le, lh
            else:
                shoulder, ear, hip = rs, re, rh

            spine_a = angle_between(hip, shoulder, ear)
            sh_tilt = abs(ls.y - rs.y)
            nose_off = shoulder.x - nose.x if shoulder.visibility > 0.5 else 0

            t = self.THRESHOLDS
            if spine_a < t["spine_angle_min"]:
                posture = "Slouching"
            elif nose_off > t["lean_forward_max"]:
                posture = "Leaning Forward"
            elif sh_tilt > t["shoulder_tilt_max"]:
                posture = "Shoulder Tilt"
            else:
                posture = "Good Posture"

            return {
                "posture": posture,
                "spine_angle": round(spine_a, 1),
                "shoulder_tilt": round(sh_tilt, 3),
                "tip": self.TIPS.get(posture, ""),
            }

        except Exception:
            return {
                "posture": "Good Posture",
                "spine_angle": 0.0,
                "shoulder_tilt": 0.0,
                "tip": self.TIPS["Good Posture"],
            }
