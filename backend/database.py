"""
database.py

Replaces posture_report.txt with a real, queryable SQLite table.
Same information the old text file had (score, worst issue, tip, timestamp)
but now supports a GET /sessions endpoint, filtering, and future charting
in the frontend — none of which a flat text file can do.
"""

import sqlite3
import json
from datetime import datetime
from contextlib import contextmanager

from config import DATABASE_PATH
from posture_engine import PostureClassifier

_tips = PostureClassifier.TIPS


@contextmanager
def get_connection():
    """
    One connection per call, closed automatically. Fine for a project at
    this scale — SQLite handles this pattern well for low-concurrency apps.
    If this were expected to handle many simultaneous users, a pooled
    connection or Postgres would be the next upgrade.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Call once on app startup. Safe to call repeatedly (IF NOT EXISTS)."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                label           TEXT NOT NULL,
                timestamp       TEXT NOT NULL,
                score           INTEGER NOT NULL,
                duration_min    REAL NOT NULL,
                avg_spine_deg   REAL NOT NULL,
                worst_streak    INTEGER NOT NULL,
                time_of_day     TEXT NOT NULL,
                top_issue       TEXT NOT NULL,
                tip             TEXT NOT NULL,
                posture_counts  TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _top_issue(posture_counts: dict) -> str:
    """Same logic as the old _write_report — the most frequent non-good label."""
    bad = {k: v for k, v in posture_counts.items() if k != "Good Posture"}
    if not bad:
        return "None"
    return max(bad, key=bad.get)


def log_session(stats: dict, label: str = "Session") -> int:
    """
    stats: the dict returned by ai_coach.compute_session_stats().
    Returns the new row's id.
    """
    if not stats:
        raise ValueError("Cannot log an empty session (no posture data recorded).")

    counts = stats.get("posture_counts", {})
    issue = _top_issue(counts)
    tip = _tips.get(issue, "N/A")

    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO sessions
                (label, timestamp, score, duration_min, avg_spine_deg,
                 worst_streak, time_of_day, top_issue, tip, posture_counts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                label,
                datetime.now().isoformat(),
                stats["score"],
                stats["duration_min"],
                stats["avg_spine_deg"],
                stats["worst_streak"],
                stats["time_of_day"],
                issue,
                tip,
                json.dumps(counts),
            ),
        )
        conn.commit()
        return cur.lastrowid


def get_all_sessions(limit: int = 50) -> list[dict]:
    """Most recent sessions first. Powers GET /sessions."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()

    sessions = []
    for row in rows:
        d = dict(row)
        d["posture_counts"] = json.loads(d["posture_counts"])
        sessions.append(d)
    return sessions


def get_session(session_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()

    if row is None:
        return None
    d = dict(row)
    d["posture_counts"] = json.loads(d["posture_counts"])
    return d
