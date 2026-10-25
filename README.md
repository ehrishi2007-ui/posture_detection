# Meru — Real-Time Posture Detection & AI Ergonomics Coach

Meru is a lightweight desktop ergonomics monitor that evaluates sitting posture via webcam, alerts you to sustained slouching, and provides AI coaching summaries powered by MediaPipe and Google Gemini.

---

## Quick Start

### 1. Prerequisites
- **Python 3.10+** and **Node.js 18+**
- Webcam (built-in or USB)

### 2. Backend Setup
```bash
# Set up virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Linux/macOS: source .venv/bin/activate

# Install dependencies and configure env
pip install -r requirements.txt
cp .env.example .env           # Add GEMINI_API_KEY (optional, from AI Studio)

# Start backend server
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend & Desktop App
```bash
cd frontend
npm install

# Option A: Run in Browser
npm run dev                    # http://localhost:5173

# Option B: Run as Desktop App (with System Tray & OS Alerts)
npm run electron:dev
```

---

## Core Features & Tech Stack

- **Real-Time Landmark Tracking**: MediaPipe Pose evaluates spine, neck, and shoulder alignment at $\sim 25\text{ms} - 45\text{ms}$ CPU inference latency.
- **Adaptive Low-Light Vision**: Grayscale luminance monitoring applies CLAHE (LAB color space) automatically in dim environments.
- **AI Ergonomics Coach**: Multi-model fallback chain (`gemini-2.5-flash` $\to$ `gemini-2.0-flash` $\to$ `gemini-2.0-flash-lite`) generates actionable session summaries.
- **Electron Desktop Shell**: System tray docking, auto-launch, native OS alerts, and automatic backend child-process lifecycle management.
- **Interactive Analytics & PDF Export**: Real-time spine gauge, rolling score sparklines, 7-day posture trend charts, and PDF session export.
- **Dual Persistence**: Zero-config local SQLite (`sessions.db`) or cloud Supabase PostgreSQL with migrations (`backend/migrate.py`).

**Stack**: FastAPI, MediaPipe, OpenCV, Google GenAI SDK, React 18, Vite, Electron, Recharts, SQLite/PostgreSQL.

---

## Ergonomic Metrics & Thresholds

| Metric | Reference Landmarks | Healthy Range | Detected Issue |
| :--- | :--- | :--- | :--- |
| **Spine Angle** | Hip $\to$ Shoulder $\to$ Ear | $\ge 155^\circ$ | Slouching / Rounded Back |
| **Forward Head** | Ear horizontal displacement to shoulder | Offset $< 0.18$ | Tech Neck / Forward Lean |
| **Shoulder Tilt** | Left vs. right shoulder height | $\Delta y < 0.04$ | Asymmetrical Leaning |
| **Head Tilt** | Left vs. right ear level | $\Delta y < 0.05$ | Lateral Head Tilt |

---

## Project Evolution & Technical Challenges

### Evolution: From Tkinter Monolith to Modular Desktop
Meru began as a single-process Python script utilizing **Tkinter** and `cv2.VideoCapture`. While functional as a prototype, this monolithic architecture caused UI freezes during model inference and LLM calls, locked the physical camera to the Python runtime, and logged data to a flat text file.

Meru v2.1 migrated to a decoupled client-server architecture:
1. **Decoupled Capture**: The client (React/WebRTC) owns the camera stream and posts frames to FastAPI every $\sim 400\text{ms}$.
2. **Desktop Integration**: Packaged with Electron for background system tray persistence and native OS notifications.
3. **Structured Storage**: Replaced flat files with relational SQLite and Supabase PostgreSQL with automated migrations.

```
v1.0 (Tkinter Monolith)                    v2.1 (Client-Server Desktop)
┌───────────────────────┐                  ┌──────────────────┐      ┌─────────────────┐
│ Single Process        │  ─────────────►  │ Electron + React │ ───► │ FastAPI Backend │
│ (Capture + UI + Model)│                  │ (Camera & UI)    │      │ (Pose & Gemini) │
└───────────────────────┘                  └──────────────────┘      └─────────────────┘
```

### Engineering Challenges

#### 1. Lighting Variations & CLAHE Contrast Optimization
In dim desk environments, standard pose estimators suffer from coordinate jitter and dropped landmarks.
- **Solution**: The backend checks mean frame luminance. If mean intensity drops below $75.0$, Contrast Limited Adaptive Histogram Equalization (CLAHE, `clipLimit=3.0`, `8x8` grid) is applied exclusively to the luminance ($L$) channel in LAB color space. This sharpens joint edges without distorting chroma or creating false-positive landmarks.

#### 2. Camera Angles & Perspective Distortion
Webcams placed at low desk angles (laptops) produce foreshortening that compresses vertical torso-to-neck proportions, triggering false slouching alerts.
- **Solution**: Built hardware perspective profiles (`desk_low`, `stand_eye`, `monitor_high`) paired with a one-click **Neutral Calibration** endpoint (`/calibrate/{session_id}`). Detection thresholds dynamically scale against the user's calibrated baseline rather than rigid static averages.

#### 3. Stateful Streaming Over Stateless HTTP
Continuous posture monitoring requires temporal continuity (a 5-frame majority-vote buffer to prevent flicker and a 10-second timer to detect sustained strain). However, HTTP frame uploads are inherently stateless.
- **Solution**: The backend maintains an in-memory `SessionState` registry keyed by client session UUIDs. High-frequency frames update the temporal buffer in memory, while background summaries periodically auto-flush to the database without I/O bottlenecks.

---

## API Summary

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/health` | `GET` | Readiness check used by Electron child-process supervisor |
| `/analyze` | `POST` | Ingests frame, runs CLAHE if dim, returns posture metrics and alert status |
| `/calibrate/{session_id}` | `POST` | Sets current posture as user's neutral baseline |
| `/setup/{session_id}` | `POST` | Sets physical angle profile (`desk_low`, `stand_eye`, `monitor_high`) |
| `/coach/{session_id}` | `POST` | Ends session and generates Gemini AI ergonomic coaching report |
| `/stats/summary` | `GET` | Retrieves aggregate metrics, 7-day trend, and issue distributions |
| `/sessions` | `GET` | Fetches historical session log |

---

## Production Build

```bash
cd frontend
npm run electron:build
```
Generates the platform-native installer in `frontend/dist/`.

---

## License

MIT
