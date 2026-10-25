# Posture Monitor — Frontend

React + Vite frontend for the posture monitoring app. Talks to the FastAPI
backend over HTTP; the browser owns the webcam and sends frames for analysis.

## Setup

```bash
npm install
cp .env.example .env   # edit if your backend isn't on localhost:8000
npm run dev
```

Then open http://localhost:5173. Make sure the backend is running first
(`uvicorn main:app --reload` from the backend folder) — the frontend will
show connection errors in-app if it can't reach it.

## What's here

- `src/App.jsx` — main layout, session state, API wiring
- `src/components/WebcamPanel.jsx` — camera stream + frame capture loop (one frame ~every 700ms)
- `src/components/SpineGauge.jsx` — live SVG spine-tilt indicator driven by the real spine_angle reading
- `src/components/ScoreSparkline.jsx` — rolling score chart
- `src/components/SessionHistory.jsx` — past sessions table (GET /sessions)
- `src/components/CoachReport.jsx` — end-of-session Gemini coaching report
- `src/api.js` — all backend calls in one place
- `src/utils.js` — posture-label → visual-status mapping

## Notes

- Requires a browser with webcam access (camera permission prompt on load).
- CORS is wide open (`allow_origins=["*"]`) on the backend for local dev —
  tighten this to your deployed frontend's URL before shipping.
