"""
seed.py

Deterministic demo data generator for Meru Posture Platform.
Populates the database with 14 days of realistic posture sessions,
allowing evaluators to immediately experience the dashboard, analytics,
trend charts, and reports without waiting to record live sessions.
"""

import json
import random
from datetime import datetime, timedelta
import sqlite3
import os

from config import DATABASE_PATH

DEMO_TIPS = {
    "Slouching": "Sit upright — lengthen your spine and support your lower back.",
    "Leaning Forward": "Ease back — keep your head aligned over your torso.",
    "Forward Head": "Tuck your chin slightly — keep your ears over your shoulders.",
    "Shoulder Tilt": "Level your shoulders — check your chair or armrest height.",
    "Head Tilt": "Straighten your head — keep your gaze level with the display.",
    "Good Posture": "Great posture! Keep your chest open and shoulders relaxed.",
}

SAMPLE_REPORTS = [
    "Overall great ergonomic discipline today! Your upright posture was consistent during morning hours with average spine alignment near 168 degrees. In the second half of the session, subtle forward head tilt emerged as fatigue set in. Try repositioning your monitor closer to eye level and taking a 2-minute micro-break every 45 minutes.",
    "Solid focus throughout this session. Your shoulders remained level, showing good armrest support. Slight forward leaning was detected during intensive typing periods. Keep your pelvis tilted slightly forward and use a lumbar roll to preserve spinal neutral.",
    "Encouraging progress compared to earlier sessions! Slouching duration dropped by over 30%. When transitioning between tasks, remember to tuck your chin gently and open your collarbones to prevent forward head creep.",
    "Excellent spinal alignment recorded. You sustained continuous good posture for over 18 minutes straight. Maintain this desk setup and keep your gaze directed at the top third of your display."
]


def seed_database():
    random.seed(42)  # Deterministic seed

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row

    # Ensure schema exists
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

    # Check existing seed
    cur = conn.execute("SELECT COUNT(*) FROM sessions WHERE label LIKE 'Seed %'")
    existing = cur.fetchone()[0]
    if existing > 0:
        print(f"[seed] Clearing {existing} previous seeded demo sessions...")
        conn.execute("DELETE FROM sessions WHERE label LIKE 'Seed %'")
        conn.commit()

    now = datetime.now()
    sessions_to_insert = []

    # Generate 14 days of realistic history
    for days_ago in range(13, -1, -1):
        session_date = now - timedelta(days=days_ago)
        
        # 1 to 2 sessions per day
        sessions_today = 1 if days_ago in (0, 6, 7, 13) else random.choice([1, 2])
        
        for s_idx in range(sessions_today):
            hour = 9 + s_idx * 5 + random.randint(0, 2)
            minute = random.randint(5, 50)
            session_time = session_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Posture stats with realistic distribution
            score = random.randint(68, 94)
            duration_min = round(random.uniform(18.0, 52.0), 1)
            total_frames = int(duration_min * 60 / 0.4)
            
            good_frames = int(total_frames * (score / 100.0))
            bad_frames = total_frames - good_frames
            
            # Distribute bad frames
            issues = ["Slouching", "Forward Head", "Leaning Forward", "Shoulder Tilt"]
            weights = [0.45, 0.25, 0.20, 0.10]
            top_issue = random.choices(issues, weights=weights)[0]
            
            posture_counts = {
                "Good Posture": good_frames,
                "Slouching": int(bad_frames * 0.45),
                "Forward Head": int(bad_frames * 0.25),
                "Leaning Forward": int(bad_frames * 0.20),
                "Shoulder Tilt": int(bad_frames * 0.10),
            }
            
            avg_spine = round(152.0 + (score / 100.0) * 22.0 + random.uniform(-2.0, 2.0), 1)
            worst_streak = random.randint(8, 35)
            best_good_streak = random.randint(45, 180)
            
            time_of_day = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
            ai_report = random.choice(SAMPLE_REPORTS)
            tip = DEMO_TIPS.get(top_issue, "Keep spine neutral.")
            
            sessions_to_insert.append((
                f"Seed Session {days_ago}d",
                session_time.isoformat(),
                score,
                duration_min,
                avg_spine,
                worst_streak,
                best_good_streak,
                time_of_day,
                top_issue,
                tip,
                json.dumps(posture_counts),
                ai_report
            ))

    conn.executemany(
        """
        INSERT INTO sessions
            (label, timestamp, score, duration_min, avg_spine_deg,
             worst_streak, best_good_streak, time_of_day, top_issue, tip, posture_counts, ai_report)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        sessions_to_insert
    )
    conn.commit()
    conn.close()
    print(f"[seed] Successfully seeded {len(sessions_to_insert)} sessions across the last 14 days!")


if __name__ == "__main__":
    seed_database()
