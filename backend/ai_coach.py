"""
ai_coach.py (async)

Same model-fallback + retry logic as the original Tkinter version, but
rewritten to be awaitable so FastAPI can call it directly with `await`,
instead of using thread + callback plumbing meant for a Tkinter mainloop.
"""

import asyncio
from collections import Counter
from datetime import datetime

from google import genai
from google.genai import types
from google.genai import errors as genai_errors


# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert ergonomics coach and physiotherapist assistant
embedded in a posture monitoring app. Analyse the user's posture session data and
write a warm, specific, actionable coaching report.

Rules:
- Write in 3-4 short paragraphs. Use bullet points. No markdown. No bold text.
- Start with one honest positive observation.
- Address the main issue with one concrete corrective action.
- End with a short motivating sentence tied to their actual score.
- Keep the response detailed but under 300 words.
"""

# ─── Model fallback chain ─────────────────────────────────────────────────────
# Each model has its own independent free quota (1500 req/day each).
# If one is overloaded or quota-exhausted, the next one is tried automatically.
MODEL_FALLBACK = [
    "gemini-2.5-flash",  # best quality, try first
    "gemini-2.0-flash",  # fallback
    "gemini-2.0-flash-lite",  # lightest — almost never overloaded
]

MAX_RETRIES = 3  # attempts per model before giving up on it
RETRY_DELAY_S = 4  # seconds to wait between retries


# ─── Custom exception for clean API error responses ──────────────────────────


class CoachError(Exception):
    """Raised when all models/retries are exhausted or a non-recoverable error occurs."""

    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ─── Prompt builder (unchanged — pure function) ──────────────────────────────


def build_prompt(session_data: dict) -> str:
    counts = session_data.get("posture_counts", {})
    total = sum(counts.values()) or 1
    bad = {k: v for k, v in counts.items() if k != "Good Posture"}
    top_bad = sorted(bad.items(), key=lambda x: x[1], reverse=True)

    issues_str = (
        ", ".join(
            f"{name} ({round(v / total * 100)}% of frames)" for name, v in top_bad
        )
        or "none detected"
    )

    return (
        f"Session duration: {session_data.get('duration_min', 0):.1f} minutes\n"
        f"Time of day: {session_data.get('time_of_day', 'unknown')}\n"
        f"Overall posture score: {session_data.get('score', 0)}%\n"
        f"Average spine angle: {session_data.get('avg_spine_deg', 0):.1f} degrees "
        f"(ideal is above 160 degrees)\n"
        f"Longest bad posture streak: {session_data.get('worst_streak', 0)} consecutive frames\n"
        f"Posture breakdown - Good: {counts.get('Good Posture', 0)} frames | "
        f"Issues: {issues_str}\n\n"
        f"Write a personalised coaching report for this user."
    )


# ─── Coach class (async) ──────────────────────────────────────────────────────


class PostureCoach:
    """
    Calls Gemini asynchronously.
    - Retries automatically on 503 overloaded (up to MAX_RETRIES times)
    - Falls back to next model on 429 quota or persistent 503
    - Raises CoachError with a clear, user-facing message on failure
    """

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    async def analyse(self, session_data: dict) -> str:
        """
        Awaitable — call directly from a FastAPI route:
            report = await coach.analyse(session_stats)
        Returns the coaching report text, or raises CoachError.
        """
        prompt = build_prompt(session_data)
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=1500,
            temperature=0.7,
        )

        for model in MODEL_FALLBACK:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=config,
                    )
                    return response.text if response.text else "No response generated."

                except genai_errors.APIError as e:
                    code = getattr(e, "code", 0)
                    message = getattr(e, "message", "") or ""
                    status = getattr(e, "status", "") or ""
                    msg_lower = (message + " " + status).lower()

                    # 503 — server overloaded: retry after a short wait
                    if (
                        code == 503
                        or "overload" in msg_lower
                        or "unavailable" in msg_lower
                    ):
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(RETRY_DELAY_S)
                            continue
                        break  # exhausted retries on this model — try next

                    # 429 — quota exhausted: move to next model immediately
                    elif (
                        code == 429
                        or "quota" in msg_lower
                        or "exhausted" in msg_lower
                        or "resource_exhausted" in msg_lower
                    ):
                        break

                    # 404 — model not found (wrong name)
                    elif code == 404:
                        raise CoachError(
                            f"Model '{model}' not found. Update MODEL_FALLBACK in ai_coach.py "
                            f"with current model names from aistudio.google.com",
                            status_code=500,
                        )

                    # 403 allowlist — key has IP restrictions
                    elif "allowlist" in msg_lower:
                        raise CoachError(
                            "API key has IP restrictions set in Google Cloud. "
                            "Go to console.cloud.google.com -> APIs & Services -> Credentials -> "
                            "your key -> set Application restrictions to None, or create a fresh "
                            "unrestricted key at aistudio.google.com/apikey",
                            status_code=403,
                        )

                    # 401/403 — invalid key
                    elif code in (401, 403):
                        raise CoachError(
                            "API key is invalid or expired. Check GEMINI_API_KEY in your .env file. "
                            "Get a key at aistudio.google.com/apikey",
                            status_code=401,
                        )

                    # Anything else — surface the real message
                    else:
                        raise CoachError(
                            f"Gemini error {code}: {message or status or str(e)}"
                        )

                except CoachError:
                    raise

                except Exception as e:
                    raise CoachError(f"Unexpected error ({type(e).__name__}): {e}")

        # Every model failed after all retries
        raise CoachError(
            "All Gemini models are currently overloaded or quota-exhausted. "
            "Wait 1-2 minutes and try again — quota resets at midnight Pacific time (12:30 PM IST).",
            status_code=503,
        )


# ─── Session stats (unchanged — pure function) ───────────────────────────────


def compute_session_stats(session_log: list, spine_history: list) -> dict:
    """
    session_log   : list of (datetime, posture_label)
    spine_history : list of float spine angles
    Returns dict for PostureCoach.analyse(), or {} if no data yet.
    """
    if not session_log:
        return {}

    counts = Counter(label for _, label in session_log)
    total = sum(counts.values())
    good = counts.get("Good Posture", 0)

    start = session_log[0][0]
    end = session_log[-1][0]
    duration_min = (end - start).total_seconds() / 60

    worst = current = 0
    for _, label in session_log:
        if label != "Good Posture":
            current += 1
            worst = max(worst, current)
        else:
            current = 0

    hour = datetime.now().hour
    time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"

    return {
        "score": int(good / total * 100),
        "duration_min": duration_min,
        "posture_counts": dict(counts),
        "avg_spine_deg": sum(spine_history) / len(spine_history)
        if spine_history
        else 0,
        "worst_streak": worst,
        "time_of_day": time_of_day,
    }
