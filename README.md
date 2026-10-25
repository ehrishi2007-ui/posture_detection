# Meru — Real-Time Posture Detection & AI Ergonomics Coach

Meru is an open-source desktop ergonomics monitor that tracks sitting posture through standard webcams, detects ergonomic strain, and provides actionable coaching summaries powered by MediaPipe and Google Gemini.

Originally developed as a monolithic desktop script, Meru has evolved into a modular client-server application combining a high-throughput **FastAPI** analytical engine with an **Electron + React** desktop interface.

---

## Project Evolution

```
┌──────────────────────────────────────────────┐
│             v1.0: Tkinter Monolith           │
│  • Single-process desktop script             │
│  • cv2.VideoCapture locking local hardware   │
│  • Desktop notifications via plyer           │
│  • Blocking synchronous AI calls             │
│  • Flat text logging (posture_report.txt)    │
└──────────────────────┬───────────────────────┘
                       │
                       │ Refactored & Re-architected
                       ▼
┌──────────────────────────────────────────────┐
│           v2.1: Client-Server / Meru         │
│  • Decoupled React 18 + Vite frontend        │
│  • Electron desktop shell with system tray   │
│  • High-throughput async FastAPI backend     │
│  • Frame streaming via browser Web APIs      │
│  • CLAHE adaptive low-light enhancement      │
│  • In-memory session state + SQLite/Supabase │
│  • Async Gemini fallback chain (2.5/2.0)     │
└──────────────────────────────────────────────┘
```

### From Prototype to Modular Architecture
The initial iteration of this project was built as a single Python script using **Tkinter** for the user interface and `cv2.VideoCapture` to read frames directly from the webcam. While functional as a proof of concept, this design presented several practical limitations:
- **Tightly Coupled Capture & Analysis**: Locking the camera device inside the Python runtime made remote deployments and cross-platform desktop distribution difficult.
- **UI Blocking & Threading Overhead**: Running MediaPipe inference, Tkinter event loops, and LLM API calls in a single process led to periodic UI freezing and complex callback plumbing.
- **Unstructured Storage**: Session records were appended to a flat `posture_report.txt` file, preventing querying, aggregations, or longitudinal trend analysis.

To solve this, the application was re-architected into **Meru v2.1**:
- The camera capture responsibility was transferred entirely to the client (browser/Electron renderer) using native WebRTC/HTML5 Canvas APIs.
- The Python codebase was converted into an asynchronous **FastAPI** service focused strictly on computer vision analysis, biomechanical heuristic classification, and LLM coaching.
- The interface was rebuilt with **React 18** and packaged inside **Electron**, enabling native OS notifications, system tray docking, and auto-launch capabilities.
- Storage was migrated to structured relational databases: local **SQLite** with automated schema migrations and optional cloud sync via **Supabase PostgreSQL**.

---

## Key Technical Challenges

### 1. Robust Biomechanical Calculation Under Variable Lighting
In real-world desk work environments, lighting conditions fluctuate significantly between daytime natural lighting, harsh window backlighting, and dim late-night desk lamp illumination. Standard landmark models often lose joint tracking or introduce coordinate jitter when facial and torso contrast drops.
- **Luminance Monitoring**: Each frame is inspected for mean grayscale intensity. If mean luminance drops below $75.0$ (dim lighting) or $28.0$ (critically dark), adaptive enhancement triggers.
- **LAB Color-Space CLAHE**: Contrast Limited Adaptive Histogram Equalization (CLAHE) with a `clipLimit=3.0` and `(8, 8)` tile grid is applied exclusively to the luminance ($L$) channel in LAB color space, avoiding color distortion while recovering torso and shoulder edges.
- **Graceful Degradation**: If illumination is too low for reliable tracking, the system returns a `low_light` advisory flag rather than producing erratic posture classifications.

### 2. Camera Angles, Foreshortening & Multi-Person Distraction
Standard ergonomic guidelines assume an ideal side-profile or eye-level view. In practice, users place webcams at very different physical heights:
- Integrated laptop cameras looking upward from desk level (`desk_low`).
- Eye-level stands (`stand_eye`).
- External monitors looking downward (`monitor_high`).

Because camera perspective changes vertical torso-to-neck proportions (foreshortening), fixed thresholds produce false slouching alerts on laptop webcams. 
- **Solution**: Meru implements hardware-aware perspective profiles and a one-click **Neutral Calibration** feature (`/calibrate/{session_id}`). When calibrated, detection thresholds adjust relative to the user's natural seated baseline rather than rigid static averages.
- **Subject Isolation**: MediaPipe Pose evaluates landmark confidence (filtered at $\ge 0.60$ tracking confidence) on the primary foreground subject, minimizing interference from background movement or passing individuals.

### 3. The Migration Challenge: Stateful Streaming Over Stateless HTTP
One of the most complex hurdles during the Tkinter-to-FastAPI migration was state management. 
- In the desktop monolith, frame smoothing buffers, bad posture timers, and session duration were simple persistent in-memory variables.
- In a web architecture, HTTP requests are inherently **stateless**. Sending frames every $\sim 400\text{ms}$ as independent requests meant the server had to track continuity across calls without introducing database bottlenecking.
- **Solution**: The backend uses an in-memory `SessionState` registry indexed by client-generated session UUIDs. Each session tracks:
  - A rolling 5-frame deque for **majority-vote smoothing** (eliminating momentary landmark jitter).
  - A timestamped bad-posture start timer that triggers an alert only when a posture issue is sustained for the configured duration (default: $10\text{s}$).
  - Rolling metric buffers that periodically auto-flush statistical snapshots to SQLite every 5 minutes and upon session termination.
- **Process Orchestration**: The Electron main process manages the lifecycle of the FastAPI backend as a child process, polling `GET /health` with exponential backoff before displaying the window and guaranteeing clean process termination on application quit.

---

## Biomechanical Metrics & Performance

Meru avoids inflated accuracy claims; computer vision pose estimation is bounded by camera resolution, framing, and joint visibility. The pipeline is calibrated for chest-up desk framing with the following specifications:

| Parameter | Specification / Threshold | Note |
| :--- | :--- | :--- |
| **Model** | MediaPipe Pose (33 3D Landmarks) | `min_detection_confidence=0.6`, `min_tracking_confidence=0.6` |
| **Inference Latency** | $\sim 25\text{ms} - 45\text{ms}$ per frame | Tested on standard modern x86/ARM CPU (no dedicated GPU required) |
| **Client Polling Interval** | $\sim 400\text{ms} - 700\text{ms}$ | Balance between near-realtime feedback and minimal CPU utilization |
| **Temporal Smoothing** | 5-Frame Majority Vote | Dampens transient tracking noise without introducing perceptual lag |
| **Spine Neutral Angle** | $\ge 155^\circ$ (Ear $\to$ Shoulder $\to$ Hip) | Catches early spine rounding (calibrated tighter than default $145^\circ$) |
| **Shoulder Level Delta** | $\Delta y < 0.04$ (Normalized) | Detects unilateral leaning or uneven arm rests |
| **Forward Head Ratio** | Horizontal ear-to-shoulder offset | Proxied via lateral landmark displacement |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Meru Desktop                          │
│                                                             │
│   ┌───────────────────────────┐    Native Notifications     │
│   │   Electron Main Process   │ ◄─────────────────────────┐ │
│   │   • System Tray & Min     │                           │ │
│   │   • Auto-Launch Control   │                           │ │
│   │   • Subprocess Lifespan   │                           │ │
│   └─────────────┬─────────────┘                           │ │
│                 │                                         │ │
│   ┌─────────────▼─────────────┐   Webcam Video Frames     │ │
│   │    React + Vite Client    │ ────────────────────────┐ │ │
│   │   • Live Spine SVG Gauge  │                         │ │ │
│   │   • Session Analytics     │                         │ │ │
│   │   • PDF Report Generation │                         │ │ │
│   │   • Supabase Auth / Local │                         │ │ │
│   └───────────────────────────┘                         │ │ │
└─────────────────────────────────────────────────────────┼─┼─┘
                                                          │ │
                                      POST /analyze       │ │ Alert Flag
                                      (~400ms interval)   │ │
                                                          ▼ │
┌───────────────────────────────────────────────────────────┴─┐
│                      FastAPI Backend                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 Image Preprocessing                 │   │
│   │  • Grayscale Luminance Check                        │   │
│   │  • Adaptive CLAHE Enhancement (LAB Color Space)     │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │             MediaPipe Pose Landmark Model           │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          Ergonomic Classification Engine            │   │
│   │  • Spine Angle          • Forward Head Tilt         │   │
│   │  • Lateral Asymmetry    • Baseline Calibration      │   │
│   │  • Majority-Vote Temporal Deque                     │   │
│   └─────────────┬─────────────────────────┬─────────────┘   │
│                 ▼                         ▼                 │
│      ┌─────────────────────┐   ┌──────────────────────┐     │
│      │   Google Gemini AI  │   │  SQLite / Supabase   │     │
│      │  (Fallback Chain)   │   │  (Relational Store)  │     │
│      └─────────────────────┘   └──────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, MediaPipe, OpenCV, NumPy, Google GenAI SDK (`google-genai`), Pydantic, Psycopg 3.
- **Frontend**: React 18, Vite, Electron, Recharts, Lucide Icons, jsPDF & jsPDF-AutoTable, Supabase Client.
- **Persistence**: SQLite (`sessions.db`) for zero-configuration local storage; PostgreSQL / Supabase for cloud sync and migration management.

---

## API Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Health check probe used by Electron for readiness verification. |
| `/analyze` | `POST` | Ingests a frame, evaluates landmarks, applies CLAHE if dim, and returns metrics. |
| `/calibrate/{session_id}` | `POST` | Records the user's current posture as their neutral upright baseline. |
| `/setup/{session_id}` | `POST` | Applies camera perspective corrections (`desk_low`, `stand_eye`, `monitor_high`). |
| `/settings/alert_threshold/{session_id}` | `POST` | Sets the sustained bad posture duration before alerts trigger (in seconds). |
| `/coach/{session_id}` | `POST` | Concludes a session and generates an LLM ergonomics report via Gemini. |
| `/stats/summary` | `GET` | Aggregated dashboard analytics: average scores, 7-day trend, and issue counts. |
| `/sessions` | `GET` | Paginated history of completed monitoring sessions. |

---

## Setup & Running Locally

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher and `npm`
- **Webcam**: Functional built-in or external camera

### 1. Backend Setup
```bash
# Set up virtual environment
python -m venv .venv

# Activate environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# Or macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Set your `GEMINI_API_KEY` in `.env` if you want AI coaching summaries enabled (available at [Google AI Studio](https://aistudio.google.com/apikey)).

Start the backend:
```bash
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend & Desktop Setup
```bash
cd frontend
npm install

# Run web version in browser:
npm run dev

# Run desktop version with Electron:
npm run electron:dev
```

---

## Building for Distribution

To create an installer for your operating system:
```bash
cd frontend
npm run electron:build
```
The packaged executable will be generated in `frontend/dist/`.

---

## License

This project is licensed under the MIT License.
