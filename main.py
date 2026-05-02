import os
import tkinter as tk
import threading
import cv2
import mediapipe as mp
import numpy as np
import time
import math
from plyer import notification
from collections import Counter, deque
from datetime import datetime
from dotenv import load_dotenv

from ai_coach import PostureCoach, compute_session_stats

# ── Load .env ─────────────────────────────────────────────────────────────────
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
coach = PostureCoach(api_key=API_KEY) if API_KEY else None

# ─── THEME ───────────────────────────────────────────────────────────────────
BG = "#0D0E11"
SURFACE = "#161820"
CARD = "#1E2029"
BORDER = "#2A2D3A"
ACCENT = "#4F8EF7"
ACCENT2 = "#7C5FD4"
GOOD = "#3ECF8E"
WARN = "#F5A623"
BAD = "#E5534B"
TEXT = "#F0F0F5"
SUBTEXT = "#8B8FA8"
FONT = "Segoe UI"


# ─── GEOMETRY ────────────────────────────────────────────────────────────────
def angle_between(a, b, c):
    ba = np.array([a.x - b.x, a.y - b.y])
    bc = np.array([c.x - b.x, c.y - b.y])
    cos_a = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cos_a, -1, 1)))


# ─── CLASSIFIER ──────────────────────────────────────────────────────────────
class PostureClassifier:
    """
    Detects 3 bad posture types only (Neck Bend removed — too many false positives):
      Slouching       — spine angle below threshold
      Leaning Forward — nose too far forward of shoulder
      Shoulder Tilt   — shoulders not level
    """

    THRESHOLDS = {
        "spine_angle_min": 145,  # degrees
        "shoulder_tilt_max": 0.05,  # normalised y-diff
        "lean_forward_max": 0.09,  # normalised x-offset
    }
    LABELS = {
        "Good Posture": ("●", GOOD, "Great! Keep it up."),
        "Slouching": ("●", BAD, "Sit upright — support your lower back"),
        "Shoulder Tilt": ("●", WARN, "Level your shoulders — check your chair"),
        "Leaning Forward": ("●", BAD, "Ease back — keep your spine neutral"),
    }

    def classify(self, lm, mp_pose):
        try:
            ls = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            rs = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
            le = lm[mp_pose.PoseLandmark.LEFT_EAR]
            re = lm[mp_pose.PoseLandmark.RIGHT_EAR]
            lh = lm[mp_pose.PoseLandmark.LEFT_HIP]
            rh = lm[mp_pose.PoseLandmark.RIGHT_HIP]
            nose = lm[mp_pose.PoseLandmark.NOSE]

            if ls.visibility >= rs.visibility:
                shoulder, ear, hip = ls, le, lh
            else:
                shoulder, ear, hip = rs, re, rh

            spine_a = angle_between(hip, shoulder, ear)
            sh_tilt = abs(ls.y - rs.y)
            nose_off = shoulder.x - nose.x if shoulder.visibility > 0.5 else 0

            t = self.THRESHOLDS
            if spine_a < t["spine_angle_min"]:
                return "Slouching", spine_a, sh_tilt
            if nose_off > t["lean_forward_max"]:
                return "Leaning Forward", spine_a, sh_tilt
            if sh_tilt > t["shoulder_tilt_max"]:
                return "Shoulder Tilt", spine_a, sh_tilt
            return "Good Posture", spine_a, sh_tilt
        except Exception:
            return "Good Posture", 0.0, 0.0


# ─── GLOBAL STATE ────────────────────────────────────────────────────────────
running = False
current_status = {"posture": "—", "score": 0, "spine": 0.0}

# session_log : permanent — never cleared, used by AI Coach
# rolling_log : cleared every 5 min for periodic file reports
session_log = []
rolling_log = []
spine_history = []
smoothing_buf = deque(maxlen=10)

mp_pose = mp.solutions.pose
mp_draw = mp.solutions.drawing_utils
pose = mp_pose.Pose(min_detection_confidence=0.6, min_tracking_confidence=0.6)
clf = PostureClassifier()


# ─── DETECTION THREAD ────────────────────────────────────────────────────────
def run_detection():
    global running, current_status, session_log, rolling_log, spine_history

    cap = cv2.VideoCapture(0)
    bad_start = None
    report_time = time.time()

    while running:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        label = "No Pose Detected"
        color_bgr = (100, 100, 100)

        if res.pose_landmarks:
            lm = res.pose_landmarks.landmark
            posture, spine_a, _ = clf.classify(lm, mp_pose)

            # Smooth over last 10 frames — stops rapid flickering
            smoothing_buf.append(posture)
            posture = Counter(smoothing_buf).most_common(1)[0][0]

            now = datetime.now()
            session_log.append((now, posture))  # permanent
            rolling_log.append((now, posture))  # cleared every 5 min
            if spine_a:
                spine_history.append(spine_a)

            label = posture
            _, col_hex, tip = clf.LABELS.get(posture, ("", SUBTEXT, ""))
            is_good = posture == "Good Posture"
            color_bgr = (62, 207, 142) if is_good else (74, 83, 229)

            if not is_good:
                if bad_start is None:
                    bad_start = time.time()
                elif time.time() - bad_start >= 10:
                    try:
                        notification.notify(
                            title="Posture Alert",
                            message=f"{posture}: {tip}",
                            timeout=4,
                        )
                    except Exception:
                        pass
                    bad_start = time.time()
            else:
                bad_start = None

            recent = session_log[-300:]
            good_c = sum(1 for _, p in recent if p == "Good Posture")
            score = int(good_c / max(len(recent), 1) * 100)
            current_status.update(
                {
                    "posture": posture,
                    "score": score,
                    "spine": round(spine_a, 1),
                }
            )

            mp_draw.draw_landmarks(
                frame,
                res.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_draw.DrawingSpec(color=color_bgr, thickness=2, circle_radius=3),
                mp_draw.DrawingSpec(color=color_bgr, thickness=2),
            )

        # Camera window HUD
        hud = frame.copy()
        cv2.rectangle(hud, (0, 0), (w, 60), (13, 14, 17), -1)
        cv2.addWeighted(hud, 0.75, frame, 0.25, 0, frame)
        cv2.putText(
            frame,
            label,
            (12, 38),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            color_bgr,
            2,
            cv2.LINE_AA,
        )
        cv2.imshow("Posture Monitor", frame)

        # 5-minute periodic report
        if time.time() - report_time >= 300:
            _write_report(rolling_log, label="5-min check")
            rolling_log.clear()
            report_time = time.time()

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()


def _write_report(log: list, label: str = "Session"):
    """Append a posture summary to posture_report.txt."""
    if not log:
        return
    count = Counter(p for _, p in log)
    total = sum(count.values())
    good = count.get("Good Posture", 0)
    score = int(good / total * 100)
    worst = max(
        (k for k in count if k != "Good Posture"),
        key=lambda k: count[k],
        default="None",
    )
    tip = clf.LABELS.get(worst, ("", "", "N/A"))[2]

    entry = (
        f"\n{'─' * 44}\n"
        f"[{label}]  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}\n"
        f"Score  : {score}%  ({good}/{total} frames good)\n"
        f"Issue  : {worst}\n"
        f"Tip    : {tip}\n"
        f"{'─' * 44}\n"
    )
    with open("posture_report.txt", "a", encoding="utf-8") as f:
        f.write(entry)


# ─── SCROLLABLE FRAME HELPER ─────────────────────────────────────────────────
def make_scrollable(parent, bg_color):
    """
    Returns (outer_frame, inner_frame, canvas).
    Pack outer_frame in your layout, add widgets to inner_frame.
    Mousewheel scrolling included for Windows / Mac / Linux.
    """
    outer = tk.Frame(parent, bg=bg_color)
    canvas = tk.Canvas(outer, bg=bg_color, highlightthickness=0, bd=0)
    vsb = tk.Scrollbar(outer, orient="vertical", command=canvas.yview)
    canvas.configure(yscrollcommand=vsb.set)

    vsb.pack(side="right", fill="y")
    canvas.pack(side="left", fill="both", expand=True)

    inner = tk.Frame(canvas, bg=bg_color)
    window_id = canvas.create_window((0, 0), window=inner, anchor="nw")

    # Keep inner width = canvas width so content fills horizontally
    inner.bind(
        "<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )
    canvas.bind("<Configure>", lambda e: canvas.itemconfig(window_id, width=e.width))

    def _scroll(event):
        if event.num == 4:
            canvas.yview_scroll(-1, "units")
        elif event.num == 5:
            canvas.yview_scroll(1, "units")
        else:
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    for w in (canvas, inner):
        w.bind("<MouseWheel>", _scroll)
        w.bind("<Button-4>", _scroll)
        w.bind("<Button-5>", _scroll)

    return outer, inner, canvas


# ─── SHARED HELPERS ──────────────────────────────────────────────────────────
def _append_text(widget, text):
    """Thread-safe append to a disabled Text widget."""
    widget.config(state="normal")
    widget.insert("end", text)
    widget.see("end")
    widget.config(state="disabled")


def _btn(parent, text, cmd, fg=BG, bg=ACCENT, state="normal"):
    b = tk.Button(
        parent,
        text=text,
        command=cmd,
        bg=bg,
        fg=fg,
        activebackground=bg,
        font=(FONT, 10, "bold"),
        bd=0,
        relief="flat",
        pady=8,
        cursor="hand2",
        state=state,
    )
    b.pack(fill="x", padx=12, pady=2)
    return b


# ─── MAIN UI ─────────────────────────────────────────────────────────────────
def build_ui():
    root = tk.Tk()
    root.title("Posture Monitor")
    root.state("zoomed")  # maximised — minimize/restore work correctly
    root.configure(bg=BG)
    root.minsize(860, 560)

    # Two-column layout: sidebar | main area
    sidebar = tk.Frame(root, bg=SURFACE, width=256)
    sidebar.pack(side="left", fill="y")
    sidebar.pack_propagate(False)

    main_area = tk.Frame(root, bg=BG)
    main_area.pack(side="left", fill="both", expand=True)

    # ── Sidebar header ────────────────────────────────────────────────────────
    tk.Frame(sidebar, bg=BORDER, height=1).pack(fill="x")
    hdr = tk.Frame(sidebar, bg=SURFACE, pady=20)
    hdr.pack(fill="x")
    tk.Label(hdr, text="POSTURE", fg=TEXT, bg=SURFACE, font=(FONT, 16, "bold")).pack()
    tk.Label(
        hdr, text="AI MONITOR", fg=ACCENT, bg=SURFACE, font=(FONT, 9, "bold")
    ).pack()
    tk.Frame(sidebar, bg=BORDER, height=1).pack(fill="x", pady=(0, 10))

    # ── Score ring ────────────────────────────────────────────────────────────
    sc = tk.Canvas(sidebar, width=160, height=160, bg=SURFACE, highlightthickness=0)
    sc.pack(pady=6)

    def draw_ring(score):
        sc.delete("all")
        cx, cy, r = 80, 80, 60
        sc.create_arc(
            cx - r,
            cy - r,
            cx + r,
            cy + r,
            start=90,
            extent=-360,
            style="arc",
            outline=BORDER,
            width=9,
        )
        ext = -int(score / 100 * 360)
        col = GOOD if score >= 70 else WARN if score >= 40 else BAD
        if ext:
            sc.create_arc(
                cx - r,
                cy - r,
                cx + r,
                cy + r,
                start=90,
                extent=ext,
                style="arc",
                outline=col,
                width=9,
            )
        sc.create_text(cx, cy - 8, text=f"{score}%", fill=TEXT, font=(FONT, 24, "bold"))
        sc.create_text(cx, cy + 14, text="posture score", fill=SUBTEXT, font=(FONT, 8))

    draw_ring(0)

    # ── Status ────────────────────────────────────────────────────────────────
    tk.Frame(sidebar, bg=BORDER, height=1).pack(fill="x", padx=16)
    sf = tk.Frame(sidebar, bg=SURFACE, pady=8)
    sf.pack(fill="x")
    status_dot = tk.Label(sf, text="●", fg=SUBTEXT, bg=SURFACE, font=(FONT, 12))
    status_dot.pack()
    status_lbl = tk.Label(
        sf, text="Not running", fg=SUBTEXT, bg=SURFACE, font=(FONT, 10)
    )
    status_lbl.pack()
    tk.Frame(sidebar, bg=BORDER, height=1).pack(fill="x", padx=16, pady=6)

    # ── Spine angle card ──────────────────────────────────────────────────────
    mc = tk.Frame(sidebar, bg=CARD, padx=12, pady=8)
    mc.pack(fill="x", padx=12, pady=3)
    tk.Label(mc, text="SPINE ANGLE", fg=SUBTEXT, bg=CARD, font=(FONT, 7, "bold")).pack(
        anchor="w"
    )
    spine_val = tk.Label(mc, text="—", fg=TEXT, bg=CARD, font=(FONT, 16, "bold"))
    spine_val.pack(anchor="w")

    tk.Frame(sidebar, bg=BG).pack(fill="both", expand=True)

    # ── Sidebar buttons ───────────────────────────────────────────────────────
    btn_frame = tk.Frame(sidebar, bg=SURFACE)
    btn_frame.pack(fill="x", pady=10)

    current_overlay = {"ref": None}

    def _clear():
        if current_overlay["ref"] and current_overlay["ref"].winfo_exists():
            current_overlay["ref"].destroy()
        current_overlay["ref"] = None

    def start_session():
        global running
        if running:
            return
        running = True
        status_dot.config(fg=GOOD)
        status_lbl.config(text="Monitoring…", fg=TEXT)
        threading.Thread(target=run_detection, daemon=True).start()

    def stop_session():
        global running
        running = False
        status_dot.config(fg=SUBTEXT)
        status_lbl.config(text="Stopped", fg=SUBTEXT)
        # Write report immediately when user clicks Stop
        if rolling_log:
            _write_report(rolling_log, label="Session end")
            rolling_log.clear()

    def open_coach():
        _clear()
        current_overlay["ref"] = _show_coach(main_area)

    def open_logs():
        _clear()
        current_overlay["ref"] = _show_logs(main_area)

    _btn(btn_frame, "▶  START SESSION", start_session, bg=GOOD)
    _btn(btn_frame, "■  STOP", stop_session, bg=BAD)
    _btn(btn_frame, "🤖  AI COACH", open_coach, bg=ACCENT2, fg=TEXT)
    _btn(btn_frame, "📋  VIEW LOGS", open_logs, bg=CARD, fg=TEXT)

    # ── Dashboard (scrollable) ────────────────────────────────────────────────
    dash_outer, dash_inner, _ = make_scrollable(main_area, BG)
    dash_outer.pack(fill="both", expand=True)

    tk.Label(
        dash_inner, text="Live Session", fg=TEXT, bg=BG, font=(FONT, 20, "bold")
    ).pack(anchor="w", padx=36, pady=(32, 2))
    tk.Label(
        dash_inner,
        text="Your posture data in real time",
        fg=SUBTEXT,
        bg=BG,
        font=(FONT, 10),
    ).pack(anchor="w", padx=36)
    tk.Frame(dash_inner, bg=BORDER, height=1).pack(fill="x", padx=36, pady=14)

    tk.Label(
        dash_inner, text="RECENT FRAMES", fg=SUBTEXT, bg=BG, font=(FONT, 8, "bold")
    ).pack(anchor="w", padx=36, pady=(0, 6))

    lf = tk.Frame(dash_inner, bg=BG)
    lf.pack(fill="x", padx=36)
    log_rows = []
    for _ in range(6):
        row = tk.Frame(lf, bg=CARD, pady=5, padx=14)
        row.pack(fill="x", pady=2)
        lbl = tk.Label(row, text="—", fg=SUBTEXT, bg=CARD, font=(FONT, 10))
        lbl.pack(anchor="w")
        log_rows.append(lbl)

    tip_card = tk.Frame(dash_inner, bg=CARD, padx=20, pady=14)
    tip_card.pack(fill="x", padx=36, pady=16)
    tk.Label(
        tip_card, text="CURRENT TIP", fg=ACCENT, bg=CARD, font=(FONT, 8, "bold")
    ).pack(anchor="w")
    tip_lbl = tk.Label(
        tip_card,
        text="Start a session to see personalised tips.",
        fg=TEXT,
        bg=CARD,
        font=(FONT, 11),
        wraplength=500,
        justify="left",
    )
    tip_lbl.pack(anchor="w", pady=(4, 0))
    tk.Frame(dash_inner, bg=BG, height=40).pack()

    # ── Refresh loop ──────────────────────────────────────────────────────────
    # frozen_log stores (timestamp_string, label) captured at frame time — never updated
    frozen_log = deque(maxlen=6)
    last_log_len = [0]

    def refresh():
        if running:
            s = current_status
            draw_ring(s["score"])
            p = s["posture"]
            _, col, tip = clf.LABELS.get(p, ("", SUBTEXT, ""))
            status_dot.config(fg=col)
            status_lbl.config(text=p, fg=col)
            spine_val.config(text=f"{s['spine']}°")

            # Only add a new entry when session_log grows
            cur_len = len(session_log)
            if cur_len > last_log_len[0] and cur_len > 0:
                ts = session_log[-1][0].strftime("%H:%M:%S")
                lbl = session_log[-1][1]
                frozen_log.append((ts, lbl))
                last_log_len[0] = cur_len

            items = list(frozen_log)
            for i, row_lbl in enumerate(log_rows):
                idx = len(items) - 1 - i
                if idx >= 0:
                    ts, pp = items[idx]
                    _, pc, _ = clf.LABELS.get(pp, ("", SUBTEXT, ""))
                    row_lbl.config(text=f"{ts}  ·  {pp}", fg=pc)
                else:
                    row_lbl.config(text="—", fg=SUBTEXT)

            tip_lbl.config(text=tip if tip else "Keep it up!")

        root.after(400, refresh)

    refresh()
    root.mainloop()


# ─── AI COACH OVERLAY ────────────────────────────────────────────────────────
def _show_coach(container):
    overlay = tk.Frame(container, bg=BG)
    overlay.place(relwidth=1, relheight=1)

    top = tk.Frame(overlay, bg=BG)
    top.pack(fill="x", side="top")

    hdr = tk.Frame(top, bg=BG)
    hdr.pack(fill="x", padx=36, pady=(28, 0))
    tk.Label(hdr, text="AI Coach", fg=TEXT, bg=BG, font=(FONT, 20, "bold")).pack(
        side="left"
    )
    tk.Button(
        hdr,
        text="← Back",
        command=overlay.destroy,
        bg=CARD,
        fg=TEXT,
        font=(FONT, 10),
        bd=0,
        padx=12,
        pady=5,
        cursor="hand2",
    ).pack(side="right")

    tk.Label(
        top,
        text="Powered by Gemini · your personal Ergonomics coach",
        fg=SUBTEXT,
        bg=BG,
        font=(FONT, 9),
    ).pack(anchor="w", padx=36, pady=(4, 14))
    tk.Frame(top, bg=BORDER, height=1).pack(fill="x", padx=36)

    global coach, API_KEY

    if not API_KEY:
        kf = tk.Frame(top, bg=BG)
        kf.pack(fill="x", padx=36, pady=14)
        tk.Label(
            kf, text="GEMINI API KEY", fg=SUBTEXT, bg=BG, font=(FONT, 8, "bold")
        ).pack(anchor="w")
        tk.Label(
            kf,
            text="Get a free key at aistudio.google.com/apikey  (no billing needed)",
            fg=SUBTEXT,
            bg=BG,
            font=(FONT, 8),
        ).pack(anchor="w", pady=(2, 6))

        kr = tk.Frame(kf, bg=BG)
        kr.pack(fill="x")
        key_entry = tk.Entry(
            kr,
            show="•",
            bg=CARD,
            fg=TEXT,
            insertbackground=TEXT,
            font=(FONT, 11),
            relief="flat",
            bd=0,
        )
        key_entry.pack(side="left", fill="x", expand=True, ipady=7, padx=(0, 8))
        key_status = tk.Label(kf, text="", fg=SUBTEXT, bg=BG, font=(FONT, 9))
        key_status.pack(anchor="w", pady=(6, 0))

        def save_key():
            global coach, API_KEY
            k = key_entry.get().strip()
            if len(k) > 10:
                API_KEY = k
                coach = PostureCoach(api_key=k)
                kf.pack_forget()
                key_status.config(text="✓ Key saved for this session", fg=GOOD)
            else:
                key_status.config(
                    text="Key too short — paste the full key from AI Studio.", fg=BAD
                )

        tk.Button(
            kr,
            text="Save",
            command=save_key,
            bg=ACCENT,
            fg=BG,
            font=(FONT, 10, "bold"),
            bd=0,
            padx=14,
            ipady=7,
            cursor="hand2",
        ).pack(side="left")

    snap = tk.Frame(top, bg=CARD, padx=20, pady=14)
    snap.pack(fill="x", padx=36, pady=(14, 8))
    tk.Label(
        snap, text="SESSION SNAPSHOT", fg=ACCENT, bg=CARD, font=(FONT, 8, "bold")
    ).pack(anchor="w")

    stats = compute_session_stats(session_log, spine_history)

    if stats:
        count = stats.get("posture_counts", {})
        total = sum(count.values())
        line1 = f"Score: {stats['score']}%   ·   Duration: {stats['duration_min']:.1f} min   ·   Frames: {total}"
        line2 = f"Avg spine: {stats['avg_spine_deg']:.1f}°   ·   Worst bad streak: {stats['worst_streak']} frames"
        summary = line1 + "\n" + line2
    else:
        summary = "No session data yet — start and run a monitoring session first."

    tk.Label(
        snap,
        text=summary,
        fg=TEXT,
        bg=CARD,
        font=(FONT, 10),
        wraplength=560,
        justify="left",
    ).pack(anchor="w", pady=(6, 0))

    tk.Label(top, text="COACH REPORT", fg=SUBTEXT, bg=BG, font=(FONT, 8, "bold")).pack(
        anchor="w", padx=36, pady=(10, 4)
    )

    # Button and status bar packed to bottom BEFORE text box
    # so they are always visible regardless of text box content
    status_bar = tk.Label(overlay, text="", fg=SUBTEXT, bg=BG, font=(FONT, 9))
    status_bar.pack(side="bottom", anchor="w", padx=36, pady=(0, 8))

    analyse_btn = tk.Button(
        overlay,
        text="✦  Get AI Coaching",
        bg=ACCENT2 if stats else BORDER,
        fg=TEXT,
        activebackground=ACCENT2,
        font=(FONT, 12, "bold"),
        bd=0,
        pady=10,
        cursor="hand2",
        state="normal" if stats else "disabled",
    )
    analyse_btn.pack(side="bottom", fill="x", padx=36, pady=(0, 6))

    # Text box fills all remaining space — no height cap, no scrollbar
    coach_txt = tk.Text(
        overlay,
        bg=CARD,
        fg=TEXT,
        font=(FONT, 12),
        bd=0,
        padx=16,
        pady=14,
        relief="flat",
        wrap="word",
        state="disabled",
        insertbackground=TEXT,
        selectbackground=ACCENT,
    )
    coach_txt.pack(fill="both", expand=True, padx=36, pady=(0, 6))

    def run_analysis():
        if not coach:
            _append_text(coach_txt, "Please enter your Gemini API key above first.")
            return
        if not stats:
            _append_text(
                coach_txt,
                "No session data to analyse.\n"
                "Start a monitoring session for at least a minute, then return here.",
            )
            return

        analyse_btn.config(state="disabled", text="Analysing…")
        coach_txt.config(state="normal")
        coach_txt.delete("1.0", "end")
        coach_txt.config(state="disabled")
        status_bar.config(text="Gemini is thinking…", fg=ACCENT)

        import queue as _q

        chunk_queue = _q.Queue()

        def on_chunk(text):
            chunk_queue.put(("chunk", text))

        def on_done():
            chunk_queue.put(("done", None))

        def on_error(msg):
            chunk_queue.put(("error", msg))

        def drain():
            try:
                while True:
                    kind, data = chunk_queue.get_nowait()
                    if kind == "chunk":
                        _append_text(coach_txt, data)
                    elif kind == "done":
                        analyse_btn.config(state="normal", text="✦  Get AI Coaching")
                        status_bar.config(text="Analysis complete.", fg=GOOD)
                        return
                    elif kind == "error":
                        _append_text(coach_txt, data)
                        analyse_btn.config(state="normal", text="✦  Get AI Coaching")
                        status_bar.config(
                            text="Error — read the report box above for fix instructions.",
                            fg=BAD,
                        )
                        return
            except _q.Empty:
                pass
            if overlay.winfo_exists():
                overlay.after(50, drain)

        coach.analyse(stats, on_chunk=on_chunk, on_done=on_done, on_error=on_error)
        overlay.after(50, drain)

    analyse_btn.config(command=run_analysis)
    return overlay


# ─── LOG VIEWER ──────────────────────────────────────────────────────────────
def _show_logs(container):
    overlay = tk.Frame(container, bg=BG)
    overlay.place(relwidth=1, relheight=1)

    hdr = tk.Frame(overlay, bg=BG)
    hdr.pack(fill="x", padx=36, pady=(28, 4))
    tk.Label(hdr, text="Session Logs", fg=TEXT, bg=BG, font=(FONT, 20, "bold")).pack(
        side="left"
    )
    tk.Button(
        hdr,
        text="← Back",
        command=overlay.destroy,
        bg=CARD,
        fg=TEXT,
        font=(FONT, 10),
        bd=0,
        padx=12,
        pady=5,
        cursor="hand2",
    ).pack(side="right")

    tk.Label(
        overlay,
        text="posture_report.txt  —  written on STOP and every 5 minutes",
        fg=SUBTEXT,
        bg=BG,
        font=(FONT, 9),
    ).pack(anchor="w", padx=36, pady=(0, 12))

    wrap = tk.Frame(overlay, bg=CARD)
    wrap.pack(fill="both", expand=True, padx=36, pady=(0, 24))
    vsb = tk.Scrollbar(wrap, orient="vertical")
    txt = tk.Text(
        wrap,
        bg=CARD,
        fg=TEXT,
        font=(FONT, 10),
        bd=0,
        padx=16,
        pady=14,
        relief="flat",
        wrap="word",
        yscrollcommand=vsb.set,
        selectbackground=ACCENT,
    )
    vsb.config(command=txt.yview)
    vsb.pack(side="right", fill="y")
    txt.pack(side="left", fill="both", expand=True)

    try:
        with open("posture_report.txt", encoding="utf-8") as f:
            content = f.read().strip()
        txt.insert("end", content if content else "No reports written yet.")
    except FileNotFoundError:
        txt.insert(
            "end",
            "posture_report.txt not found.\n\n"
            "Run a session and click STOP — the report is written immediately.",
        )

    txt.config(state="disabled")
    txt.see("end")
    return overlay


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    build_ui()
