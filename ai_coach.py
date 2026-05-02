import time
import threading
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

# Retry settings for 503 overloaded errors
MAX_RETRIES = 3  # attempts per model before giving up on it
RETRY_DELAY_S = 4  # seconds to wait between retries


# ─── Prompt builder ───────────────────────────────────────────────────────────


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


# ─── Coach class ──────────────────────────────────────────────────────────────


class PostureCoach:
    """
    Calls Gemini in a background thread.
    - Retries automatically on 503 overloaded (up to MAX_RETRIES times)
    - Falls back to next model on 429 quota or persistent 503
    - Shows clear fix instructions for key/permission errors
    """

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self._thread: threading.Thread | None = None

    def analyse(self, session_data, on_chunk, on_done, on_error):
        """Non-blocking — safe to call from the tkinter main thread."""
        if self._thread and self._thread.is_alive():
            on_error(
                "Already running — please wait for the current analysis to finish."
            )
            return
        self._thread = threading.Thread(
            target=self._run,
            args=(session_data, on_chunk, on_done, on_error),
            daemon=True,
        )
        self._thread.start()

    def _run(self, session_data, on_chunk, on_done, on_error):
        prompt = build_prompt(session_data)
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=1500,
            temperature=0.7,
        )

        for model in MODEL_FALLBACK:
            # Try each model up to MAX_RETRIES times (for 503 overloaded)
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    # Notify user which model/attempt we're on
                    if attempt > 1:
                        on_chunk(f"[Retrying with {model}, attempt {attempt}...]\n\n")
                    elif model != MODEL_FALLBACK[0]:
                        on_chunk(f"[Trying {model}...]\n\n")

                    response = self.client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=config,
                    )
                    full_text = (
                        response.text if response.text else "No response generated."
                    )

                    on_chunk(full_text)
                    on_done()
                    return  # success — stop everything

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
                            on_chunk(
                                f"[Gemini is busy, waiting {RETRY_DELAY_S}s before retry...]\n"
                            )
                            time.sleep(RETRY_DELAY_S)
                            continue  # retry same model
                        else:
                            # All retries used — move to next model
                            break

                    # 429 — quota exhausted: move to next model immediately
                    elif (
                        code == 429
                        or "quota" in msg_lower
                        or "exhausted" in msg_lower
                        or "resource_exhausted" in msg_lower
                    ):
                        break  # try next model

                    # 404 — model not found (wrong name)
                    elif code == 404:
                        on_error(
                            f"Model '{model}' not found.\n"
                            "Update MODEL_FALLBACK in ai_coach.py with current model names.\n"
                            "Check available models at: aistudio.google.com"
                        )
                        return

                    # 403 allowlist — key has IP restrictions
                    elif "allowlist" in msg_lower:
                        on_error(
                            "API key has IP restrictions set in Google Cloud.\n\n"
                            "Fix:\n"
                            "1. Go to console.cloud.google.com\n"
                            "2. APIs & Services -> Credentials -> click your key\n"
                            "3. Application restrictions -> None\n"
                            "4. API restrictions -> Don't restrict key -> Save\n\n"
                            "Or create a fresh unrestricted key at aistudio.google.com/apikey"
                        )
                        return

                    # 401/403 — invalid key
                    elif code in (401, 403) and "allowlist" not in msg_lower:
                        on_error(
                            "API key is invalid or expired.\n"
                            "Check GEMINI_API_KEY in your .env file.\n"
                            "Get a key at: aistudio.google.com/apikey"
                        )
                        return

                    # Anything else — show the real message
                    else:
                        on_error(f"Gemini error {code}: {message or status or str(e)}")
                        return

                except Exception as e:
                    on_error(f"Unexpected error ({type(e).__name__}): {e}")
                    return

        # Every model failed after all retries
        on_error(
            "All Gemini models are currently overloaded or quota-exhausted.\n\n"
            "Wait 1-2 minutes and try again (503 overload is usually temporary)\n"
            "Quota resets at midnight Pacific time (12:30 PM IST)."
        )


# ─── Session stats ────────────────────────────────────────────────────────────


def compute_session_stats(session_log: list, spine_history: list) -> dict:
    """
    session_log   : list of (datetime, posture_label) — never cleared
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
