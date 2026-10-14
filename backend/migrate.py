"""
migrate.py

Lightweight database migration runner for Meru Posture Platform.
Scans backend/migrations/ for versioned SQL scripts and executes them
in order, keeping track of applied versions in schema_migrations.
"""

import os
import glob
from pathlib import Path
from dotenv import load_dotenv
import psycopg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run_migrations():
    if not DATABASE_URL:
        print("[migrate] ERROR: DATABASE_URL environment variable is not set.")
        print("[migrate] Set DATABASE_URL in your .env file to your Supabase Postgres connection URI.")
        return False

    print(f"[migrate] Connecting to Postgres database...")
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Ensure migration tracker table exists
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        version     TEXT PRIMARY KEY,
                        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
                conn.commit()

                # Get already applied migrations
                cur.execute("SELECT version FROM schema_migrations;")
                applied = {row[0] for row in cur.fetchall()}

                # Find all .sql migration files sorted alphabetically
                sql_files = sorted(glob.glob(str(MIGRATIONS_DIR / "*.sql")))
                if not sql_files:
                    print("[migrate] No migration files found in backend/migrations/")
                    return True

                pending = [f for f in sql_files if Path(f).name not in applied]
                if not pending:
                    print(f"[migrate] Database is up to date ({len(applied)} migrations applied).")
                    return True

                print(f"[migrate] Found {len(pending)} pending migration(s):")
                for filepath in pending:
                    filename = Path(filepath).name
                    print(f"  -> Applying {filename}...")
                    with open(filepath, "r", encoding="utf-8") as f:
                        sql = f.read()

                    cur.execute(sql)
                    cur.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s);",
                        (filename,)
                    )
                    conn.commit()
                    print(f"  ✓ Applied {filename}")

                print("[migrate] All migrations applied successfully!")
                return True

    except Exception as e:
        print(f"[migrate] Migration failed: {e}")
        return False


if __name__ == "__main__":
    run_migrations()
