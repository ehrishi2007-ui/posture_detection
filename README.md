# Meru — Real-Time AI Posture Monitor & Ergonomics Coach

<p align="center">
  <b>Intelligent posture tracking, real-time biomechanical analysis, and AI-driven ergonomic coaching powered by MediaPipe and Google Gemini.</b>
</p>

---

## Overview

**Meru** is an intelligent desktop application that continuously monitors sitting posture through your webcam, alerts you to sustained slouching or ergonomic strain, and provides actionable, personalized coaching reports powered by Google Gemini.

Unlike traditional computer vision apps that process video streams directly inside heavy desktop loops, Meru decouples camera capture from analysis. The frontend captures frames and streams them to a high-performance **FastAPI** backend via HTTP, running **MediaPipe Pose** and ergonomic heuristic classifiers with sub-second latency.

---

## Key Features

- **Biomechanical Pose Tracking**: Real-time evaluation of spine angle, forward neck lean, lateral shoulder tilt, and head tilt using MediaPipe Pose.
- **Adaptive Low-Light Vision (CLAHE)**: Automatically detects dim lighting environments and applies Contrast Limited Adaptive Histogram Equalization (CLAHE) in the LAB color space to ensure reliable landmark tracking even in poorly lit rooms.
- **Personalized Neutral Baseline Calibration**: Calibrate your unique neutral posture and desk/camera setup (desk-level, eye-level, or monitor-mounted) for accurate detection across various physical environments.
- **Smart Sustained-Strain Alerts**: Configurable majority-vote smoothing prevents alert flickering, firing notifications only when poor posture persists beyond a customizable threshold (default 10s).
- **Google Gemini Ergonomics Coach**: Multi-model fallback chain (`gemini-2.5-flash` &rarr; `gemini-2.0-flash` &rarr; `gemini-2.0-flash-lite`) generates physiotherapist-grade, actionable coaching reports at the end of each session.
- **Rich Interactive Analytics**: Comprehensive dashboard showing daily posture scores, 7-day trend graphs, issue breakdowns, and longest good posture streaks.
- **Electron Desktop Shell**: Seamless background persistence via system tray, OS native notifications, auto-launch on startup, and clean background process lifecycle management.
- **Session Reports & PDF Export**: Export detailed posture breakdown summaries, metrics, and AI recommendations to PDF via jsPDF.
- **Dual Persistence Architecture**: Works out-of-the-box with local SQLite (`sessions.db`) or scalable cloud persistence with Supabase PostgreSQL and Row-Level Security (RLS).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Meru Desktop                          │
│                                                             │
│   ┌───────────────────────────┐    System Notifications     │
│   │   Electron Main Process   │ ◄─────────────────────────┐ │
│   │   • System Tray & Min     │                           │ │
│   │   • Auto-Launch           │                           │ │
│   │   • Child Process Control │                           │ │
│   └─────────────┬─────────────┘                           │ │
│                 │                                         │ │
│   ┌─────────────▼─────────────┐   Webcam Video Frames     │ │
│   │    React + Vite Client    │ ────────────────────────┐ │ │
│   │   • Live Spine Gauge      │                         │ │ │
│   │   • Realtime Score Chart  │                         │ │ │
│   │   • Session Analytics     │                         │ │ │
│   │   • AI Coach View         │                         │ │ │
│   └───────────────────────────┘                         │ │ │
└─────────────────────────────────────────────────────────┼─┼─┘
                                                          │ │
                                      HTTP /analyze       │ │ Alert Flag
                                      (Every ~400ms)      │ │
                                                          ▼ │
┌───────────────────────────────────────────────────────────┴─┐
│                      FastAPI Backend                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 Image Preprocessing                 │   │
│   │  • Low-light detection  • CLAHE LAB Enhancement     │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              MediaPipe Pose Estimation              │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          Ergonomic Classification Engine            │   │
│   │  • Spine Angle          • Neck Angle (Forward Head) │   │
│   │  • Shoulder Tilt        • Head Asymmetry            │   │
│   │  • Majority-Vote Smoothing Buffer                   │   │
│   └─────────────┬─────────────────────────┬─────────────┘   │
│                 ▼                         ▼                 │
│      ┌─────────────────────┐   ┌──────────────────────┐     │
│      │   Google Gemini AI  │   │  SQLite / Supabase   │     │
│      │  (Ergonomics Coach) │   │  (Session Storage)   │     │
│      └─────────────────────┘   └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, MediaPipe, OpenCV (`cv2`), NumPy, Google GenAI SDK (`google-genai`), Pydantic, Psycopg 3.
- **Frontend**: React 18, Vite, Electron, Recharts, Lucide Icons, jsPDF & jsPDF-AutoTable, Supabase JS Client.
- **Database**: SQLite (local) / PostgreSQL / Supabase with custom SQL migration runner.

---

## Project Structure

```
posture_detection/
├── backend/
│   ├── ai_coach.py          # Google Gemini AI coaching integration with model fallback
│   ├── config.py            # Environment validation & detection thresholds
│   ├── database.py          # SQLite persistence & query operations
│   ├── main.py              # FastAPI server routes, frame analysis & session state
│   ├── migrate.py           # Postgres / Supabase migration runner
│   ├── posture_engine.py    # MediaPipe landmark geometry & posture classifier
│   ├── seed.py              # Database seeder for demo & historical sessions
│   └── migrations/          # SQL schema migrations (001_init.sql)
├── frontend/
│   ├── electron/            # Electron main process, tray menu, and preload scripts
│   ├── src/
│   │   ├── components/      # Gauge, modals, webcam, charts, and report components
│   │   ├── layout/          # Sidebar, top navigation, and header
│   │   ├── pages/           # Dashboard, Live Monitor, History, Settings, Login
│   │   ├── api.js           # Backend API integration client
│   │   └── utils.js         # Posture status styling and helpers
│   ├── package.json         # Node scripts and dependencies
│   └── vite.config.js       # Vite bundler configuration
├── requirements.txt         # Python dependencies
├── .env.example             # Template for environment configuration
└── README.md                # Project documentation
```

---

## Getting Started

### Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher and `npm`
- **Webcam**: Standard built-in or external USB webcam

---

### 1. Backend Setup

1. **Create and activate a virtual environment:**

   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**

   Copy `.env.example` to `.env` in the project root:

   ```bash
   cp .env.example .env
   ```

   Key configuration values in `.env`:
   - `GEMINI_API_KEY`: Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).
   - `DATABASE_PATH`: Path for local SQLite storage (defaults to `sessions.db`).
   - `CORS_ORIGINS`: Allowed client URLs (default: `http://localhost:5173,http://127.0.0.1:5173`).
   - `DATABASE_URL` *(Optional)*: Supabase Postgres URI if using cloud persistence.

4. **Start the FastAPI backend:**

   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

   Verify backend health by navigating to [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

---

### 2. Frontend / Desktop Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure Frontend Environment (Optional):**

   ```bash
   cp .env.example .env
   ```

   Default configuration points to `VITE_API_URL=http://localhost:8000`.

3. **Run the Application:**

   - **Browser Development Mode (Vite):**
     ```bash
     npm run dev
     ```
     Access the web UI at [http://localhost:5173](http://localhost:5173).

   - **Desktop App Mode (Electron + Vite):**
     ```bash
     npm run electron:dev
     ```
     This starts both the Vite dev server and the Electron desktop application with tray support.

---

## Posture Classification Metrics

Meru continuously calculates ergonomic metrics using 3D pose landmarks:

| Metric | Biomechanical Reference | Default Normal Range | Triggered Issue |
| :--- | :--- | :--- | :--- |
| **Spine Angle** | Angle between hip, shoulder, and ear | $\ge 155^\circ$ | Slouching / Rounded Back |
| **Forward Head Lean** | Ear horizontal displacement relative to shoulder | Normalized offset $< 0.18$ | Forward Head / Tech Neck |
| **Shoulder Tilt** | Vertical difference between left and right shoulder | Normalized $\Delta y < 0.04$ | Shoulder Height Asymmetry |
| **Head Tilt** | Vertical asymmetry between left and right ear | Normalized $\Delta y < 0.05$ | Lateral Head Tilt |
| **Lumbar / Torso Lean** | Mid-shoulder to mid-hip vertical angle | Angle within $\pm 10^\circ$ | Leaning Forward / Backward |

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status, application name, and version |
| `POST` | `/analyze?session_id={id}` | Accepts a webcam image frame; returns posture label, angles, score, and alerts |
| `POST` | `/calibrate/{session_id}` | Captures the current frame as the user's neutral baseline |
| `POST` | `/setup/{session_id}` | Sets physical camera configuration (`desk_low`, `stand_eye`, `monitor_high`) |
| `POST` | `/settings/alert_threshold/{session_id}` | Updates sustained bad posture duration threshold (seconds) |
| `POST` | `/coach/{session_id}` | Ends monitoring session and generates a Gemini AI ergonomic report |
| `GET` | `/stats/summary?days=7` | Aggregated statistics for the dashboard (scores, trends, streaks) |
| `GET` | `/sessions` | Lists paginated historical posture sessions |
| `GET` | `/sessions/{id}` | Retrieves full session record including AI coaching summary |

---

## Cloud Database Migration (Supabase Postgres)

If deploying with Supabase cloud persistence instead of SQLite:

1. Add your `DATABASE_URL` to `.env`.
2. Run the migration script:
   ```bash
   python backend/migrate.py
   ```
3. (Optional) Seed sample session history:
   ```bash
   python backend/seed.py
   ```

---

## Building for Production

To package the desktop application into a standalone installer:

```bash
cd frontend
npm run electron:build
```

The compiled installer will be generated in `frontend/dist/`.

---

## License

This project is licensed under the MIT License.
