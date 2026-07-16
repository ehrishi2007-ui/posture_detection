"""
main.py

FastAPI backend for the posture monitoring app.

Replaces the Tkinter + cv2.imshow desktop loop with HTTP endpoints:
  POST /session/start          -> begin a new monitoring session
  POST /session/{id}/analyze   -> send one frame, get back posture + live score
  POST /session/{id}/coach     -> get a Gemini coaching report for the session so far
  POST /session/{id}/end       -> finalise the session, persist it to SQLite
  GET  /sessions               -> list past sessions
  GET  /sessions/{id}          -> get one past session

Frame-history state (session log, spine history, smoothing buffer) that used
to live in this file's global variables now lives in an in-memory SESSIONS
dict, keyed by session_id, since a stateless HTTP request can't hold that
between calls the way a single Tkinter process could.
"""

import uuid
from collections import Counter, deque
from datetime import datetime

import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

import config
import database
from posture_engine import PostureClassifier
from ai_coach import PostureCoach, compute_session_stats, CoachError


# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Posture Monitor API", version="1.0")

# Dev-friendly CORS — tighten allow_origins to your actual frontend URL
# before deploying publicly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_pose = mp.solutions.pose
# NOTE: a single shared Pose instance is fine for one user at a time
# (this project's actual usage pattern). If this ever needs to serve
# multiple simultaneous users reliably, each session should get its own
# mp_pose.Pose() instance instead of sharing this one.
pose = mp_pose.Pose(min_detection_confidence=0.6, min_tracking_confidence=0.6)
clf = PostureClassifier()

coach = PostureCoach(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


# ─── In-memory per-session state ─────────────────────────────────────────────


class SessionState:
    def __init__(self):
        self.session_log: list[tuple[datetime, str]] = []  # permanent for this session
        self.spine_history: list[float] = []
        self.smoothing_buf: deque = deque(maxlen=config.SMOOTHING_BUFFER_SIZE)
        self.created_at = datetime.now()


SESSIONS: dict[str, SessionState] = {}


def _get_session(session_id: str) -> SessionState:
    state = SESSIONS.get(session_id)
    if state is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /session/start first.",
        )
    return state


# ─── Response models ──────────────────────────────────────────────────────────


class SessionStartResponse(BaseModel):
    session_id: str


class AnalyzeResponse(BaseModel):
    posture: str
    tip: str
    spine_angle: float
    shoulder_tilt: float
    score: int


class CoachResponse(BaseModel):
    report: str


class SessionEndResponse(BaseModel):
    id: int
    score: int
    duration_min: float
    top_issue: str
    tip: str


# ─── Startup ──────────────────────────────────────────────────────────────────


@app.on_event("startup")
def on_startup():
    database.init_db()


# ─── Routes ───────────────────────────────────────────────────────────────────


@app.post("/session/start", response_model=SessionStartResponse)
def start_session():
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = SessionState()
    return SessionStartResponse(session_id=session_id)


@app.post("/session/{session_id}/analyze", response_model=AnalyzeResponse)
async def analyze_frame(session_id: str, file: UploadFile):
    state = _get_session(session_id)

    contents = await file.read()
    frame = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode image — send a valid JPEG/PNG frame.",
        )

    # MediaPipe + classification is CPU-bound sync work — run off the event loop
    # so it doesn't block other requests while it processes.
    result = await run_in_threadpool(_process_frame, frame, state)
    return result


def _process_frame(frame, state: SessionState) -> AnalyzeResponse:
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = pose.process(rgb)

    if not res.pose_landmarks:
        return AnalyzeResponse(
            posture="No Pose Detected",
            tip="",
            spine_angle=0.0,
            shoulder_tilt=0.0,
            score=0,
        )

    lm = res.pose_landmarks.landmark
    result = clf.classify(lm, mp_pose)

    # Majority-vote smoothing over the last N frames, same as the original app
    state.smoothing_buf.append(result["posture"])
    smoothed_posture = Counter(state.smoothing_buf).most_common(1)[0][0]

    now = datetime.now()
    state.session_log.append((now, smoothed_posture))
    if result["spine_angle"]:
        state.spine_history.append(result["spine_angle"])

    recent = state.session_log[-config.SCORE_WINDOW_FRAMES :]
    good_c = sum(1 for _, p in recent if p == "Good Posture")
    score = int(good_c / max(len(recent), 1) * 100)

    return AnalyzeResponse(
        posture=smoothed_posture,
        tip=clf.TIPS.get(smoothed_posture, ""),
        spine_angle=result["spine_angle"],
        shoulder_tilt=result["shoulder_tilt"],
        score=score,
    )


@app.post("/session/{session_id}/coach", response_model=CoachResponse)
async def get_coaching(session_id: str):
    if coach is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server. Add it to .env and restart.",
        )

    state = _get_session(session_id)
    stats = compute_session_stats(state.session_log, state.spine_history)
    if not stats:
        raise HTTPException(
            status_code=400,
            detail="No posture data recorded yet for this session — analyze at least one frame first.",
        )

    try:
        report = await coach.analyse(stats)
    except CoachError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return CoachResponse(report=report)


@app.post("/session/{session_id}/end", response_model=SessionEndResponse)
def end_session(session_id: str):
    state = _get_session(session_id)
    stats = compute_session_stats(state.session_log, state.spine_history)
    if not stats:
        SESSIONS.pop(session_id, None)
        raise HTTPException(
            status_code=400, detail="No posture data recorded — nothing to save."
        )

    row_id = database.log_session(stats, label="Session")
    saved = database.get_session(row_id)

    # Free the in-memory state now that it's persisted
    SESSIONS.pop(session_id, None)

    return SessionEndResponse(
        id=saved["id"],
        score=saved["score"],
        duration_min=saved["duration_min"],
        top_issue=saved["top_issue"],
        tip=saved["tip"],
    )


@app.get("/sessions")
def list_sessions(limit: int = 50):
    return database.get_all_sessions(limit=limit)


@app.get("/sessions/{session_id}")
def get_session_by_id(session_id: int):
    session = database.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"No session with id {session_id}")
    return session
