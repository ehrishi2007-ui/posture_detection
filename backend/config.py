"""
config.py

Single place where environment variables are loaded and validated.
Every other module imports from here instead of calling os.getenv()
directly — keeps env-var typos from turning into silent bugs scattered
across files.

v2: Added fine-grained posture detection thresholds as configurable
    env vars so they can be tuned without touching code (useful for
    different use-cases: desk work vs elderly monitoring vs rehab).
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# CORS origins
CORS_ORIGINS = [orig.strip() for orig in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if orig.strip()]

# SQLite file path — relative to wherever uvicorn is run from.
DATABASE_PATH = os.getenv("DATABASE_PATH", "sessions.db")

# How many frames of history to keep in memory per session for smoothing
# and score calculation.
SCORE_WINDOW_FRAMES = int(os.getenv("SCORE_WINDOW_FRAMES", "300"))

# Majority-vote smoothing buffer size (frames).
# Reduced from 10 → 5 for faster label response (~2s at 400ms/frame vs ~7s before).
SMOOTHING_BUFFER_SIZE = int(os.getenv("SMOOTHING_BUFFER_SIZE", "5"))


# ─── Posture detection thresholds ────────────────────────────────────────────
# All values are intentionally tighter than the original to catch subtle
# posture changes early. Each can be overridden via environment variable
# without a code change — useful for different monitoring contexts.

# Minimum spine angle (hip → shoulder → ear) in degrees before "Slouching" fires.
# 180° = perfectly upright. 155° catches early rounding of the back.
# Original was 145° which only caught severe slouching.
SPINE_ANGLE_MIN = float(os.getenv("SPINE_ANGLE_MIN", "155"))

# Maximum normalised y-difference between shoulders before "Shoulder Tilt" fires.
# Tightened from 0.05 → 0.03 to catch subtle asymmetry.
SHOULDER_TILT_MAX = float(os.getenv("SHOULDER_TILT_MAX", "0.03"))

# Maximum normalised nose-to-shoulder x-offset before "Leaning Forward" fires.
# Tightened from 0.09 → 0.07.
LEAN_FORWARD_MAX = float(os.getenv("LEAN_FORWARD_MAX", "0.07"))

# Maximum normalised ear-to-shoulder x-offset before "Forward Head" fires.
# New threshold. Catches chin-jutting / forward head posture that spine angle misses.
FORWARD_HEAD_MAX = float(os.getenv("FORWARD_HEAD_MAX", "0.06"))

# Maximum normalised ear height asymmetry before "Head Tilt" fires.
# New threshold. Catches lateral head lean.
HEAD_TILT_MAX = float(os.getenv("HEAD_TILT_MAX", "0.04"))

# Minimum landmark visibility confidence to attempt classification.
# Was implicitly 0.5 in the original. Raised to 0.65 to prevent false
# "Good Posture" readings when key landmarks are partially off-screen.
VISIBILITY_MIN = float(os.getenv("VISIBILITY_MIN", "0.65"))


def get_posture_thresholds() -> dict:
    """
    Returns the current threshold config as a dict compatible with
    PostureClassifier(thresholds=...). Call this once at startup so
    the classifier always uses the env-configured values.
    """
    return {
        "spine_angle_min":   SPINE_ANGLE_MIN,
        "shoulder_tilt_max": SHOULDER_TILT_MAX,
        "lean_forward_max":  LEAN_FORWARD_MAX,
        "forward_head_max":  FORWARD_HEAD_MAX,
        "head_tilt_max":     HEAD_TILT_MAX,
        "visibility_min":    VISIBILITY_MIN,
    }


def require_gemini_key() -> str:
    """
    Call this inside routes that need Gemini, instead of checking
    GEMINI_API_KEY directly everywhere. Raises a clear error if missing,
    which FastAPI can turn into a clean 500 response.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your .env file "
            "(get a key at aistudio.google.com/apikey)."
        )
    return GEMINI_API_KEY
