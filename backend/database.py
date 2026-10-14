"""
database.py

Replaces posture_report.txt with a real, queryable SQLite table.
Stores session scores, durations, spine angles, worst streaks,
posture distribution counts, and full Gemini AI coaching reports.
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
                best_good_streak INTEGER DEFAULT 0,
                time_of_day     TEXT NOT NULL,
                top_issue       TEXT NOT NULL,
                tip             TEXT NOT NULL,
                posture_counts  TEXT NOT NULL,
                ai_report       TEXT DEFAULT ''
            )
            """
        )

        # Migration: ensure ai_report and best_good_streak columns exist
        cur = conn.execute("PRAGMA table_info(sessions)")
        cols = [r["name"] for r in cur.fetchall()]
        if "ai_report" not in cols:
            conn.execute("ALTER TABLE sessions ADD COLUMN ai_report TEXT DEFAULT ''")
        if "best_good_streak" not in cols:
            conn.execute("ALTER TABLE sessions ADD COLUMN best_good_streak INTEGER DEFAULT 0")

        conn.commit()


def _top_issue(posture_counts: dict) -> str:
    bad = {k: v for k, v in posture_counts.items() if k != "Good Posture"}
    if not bad:
        return "None"
    return max(bad, key=bad.get)


def log_session(stats: dict, label: str = "Session", ai_report: str = "") -> int:
    """
    stats: the dict returned by ai_coach.compute_session_stats().
    ai_report: the full coaching narrative from Gemini.
    Returns the new row's id.
    """
    if not stats:
        raise ValueError("Cannot log an empty session (no posture data recorded).")

    counts = stats.get("posture_counts", {})
    issue = _top_issue(counts)
    tip = _tips.get(issue, "N/A")
    best_good = stats.get("best_good_streak", 0)

    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO sessions
                (label, timestamp, score, duration_min, avg_spine_deg,
                 worst_streak, best_good_streak, time_of_day, top_issue, tip, posture_counts, ai_report)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                label,
                datetime.now().isoformat(),
                stats["score"],
                stats["duration_min"],
                stats["avg_spine_deg"],
                stats["worst_streak"],
                best_good,
                stats["time_of_day"],
                issue,
                tip,
                json.dumps(counts),
                ai_report or "",
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
        d["posture_counts"] = json.loads(d["posture_counts"]) if d.get("posture_counts") else {}
        d["ai_report"] = d.get("ai_report") or ""
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
    d["posture_counts"] = json.loads(d["posture_counts"]) if d.get("posture_counts") else {}
    d["ai_report"] = d.get("ai_report") or ""
    return d
