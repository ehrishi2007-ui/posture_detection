"""
config.py

Single place where environment variables are loaded and validated.
Every other module imports from here instead of calling os.getenv()
directly — keeps env-var typos from turning into silent bugs scattered
across files.
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# SQLite file path — relative to wherever uvicorn is run from.
# Kept as an env var so it's easy to point at a different path in
# production (e.g. a mounted volume on Render/Railway) without a code change.
DATABASE_PATH = os.getenv("DATABASE_PATH", "sessions.db")

# How many frames of history to keep in memory per session for smoothing
# and score calculation. Matches the original app's `recent = session_log[-300:]`.
SCORE_WINDOW_FRAMES = int(os.getenv("SCORE_WINDOW_FRAMES", "300"))

# Size of the majority-vote smoothing buffer (frames), matches deque(maxlen=10)
SMOOTHING_BUFFER_SIZE = int(os.getenv("SMOOTHING_BUFFER_SIZE", "10"))


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
