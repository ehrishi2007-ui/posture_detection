import { useCallback, useEffect, useRef, useState } from "react";
import WebcamPanel from "./components/WebcamPanel.jsx";
import SpineGauge from "./components/SpineGauge.jsx";
import ScoreSparkline from "./components/ScoreSparkline.jsx";
import SessionHistory from "./components/SessionHistory.jsx";
import CoachReport from "./components/CoachReport.jsx";
import { analyzeFrame, getCoachReport, getSessions } from "./api.js";
import { statusForPosture } from "./utils.js";

const ALERT_DISPLAY_MS = 4000;

const EMPTY_READING = {
  posture: "",
  spine_angle: 0,
  shoulder_tilt: 0,
  tip: "",
  score: 0,
  alert: false,
};

export default function App() {
  const sessionId = useRef(crypto.randomUUID()).current;

  const [tab, setTab] = useState("live");
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState(EMPTY_READING);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  const [ending, setEnding] = useState(false);
  const [coachReport, setCoachReport] = useState(null);
  const [coachStats, setCoachStats] = useState(null);
  const [coachError, setCoachError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const alertTimeoutRef = useRef(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await getSessions(50);
      setSessions(data);
    } catch (err) {
      setSessionsError(err.message);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") loadSessions();
  }, [tab, loadSessions]);

  const handleFrame = useCallback(
    async (blob) => {
      try {
        const result = await analyzeFrame(sessionId, blob);
        setReading(result);
        setAnalyzeError(null);
        if (result.posture !== "No Pose Detected") {
          setScoreHistory((prev) => [...prev.slice(-59), result.score]);
        }
        if (result.alert) {
          setShowAlert(true);
          clearTimeout(alertTimeoutRef.current);
          alertTimeoutRef.current = setTimeout(() => setShowAlert(false), ALERT_DISPLAY_MS);
        }
      } catch (err) {
        setAnalyzeError(err.message);
      }
    },
    [sessionId]
  );

  function startSession() {
    setReading(EMPTY_READING);
    setScoreHistory([]);
    setCoachReport(null);
    setCoachStats(null);
    setCoachError(null);
    setAnalyzeError(null);
    setRunning(true);
  }

  async function endSession() {
    setRunning(false);
    setEnding(true);
    setCoachError(null);
    try {
      const { report, stats } = await getCoachReport(sessionId);
      setCoachReport(report);
      setCoachStats(stats);
      loadSessions();
    } catch (err) {
      setCoachError(err.message);
    } finally {
      setEnding(false);
    }
  }

  const status = statusForPosture(reading.posture);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          posture<span>monitor</span>
        </h1>
        <div className="tabs">
          <button className={`tab ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>
            Live session
          </button>
          <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            History
          </button>
        </div>
      </header>

      <main className="app-body">
        {tab === "live" ? (
          <>
            <div className="session-grid">
              <div className="panel">
                <h3 className="panel-title">Camera</h3>
                <WebcamPanel active={running} onFrame={handleFrame} currentPosture={reading.posture} />

                {analyzeError && <div className="error-banner" style={{ marginTop: 14 }}>{analyzeError}</div>}

                <div className="readout-row">
                  <div className="readout">
                    <div className="readout-label">Rolling score</div>
                    <div className="readout-value">{reading.score}%</div>
                  </div>
                  <div className="readout">
                    <div className="readout-label">Shoulder tilt</div>
                    <div className="readout-value">{reading.shoulder_tilt.toFixed(3)}</div>
                  </div>
                </div>

                {reading.tip && (
                  <div className={`tip-banner status-${status}`}>{reading.tip}</div>
                )}

                {showAlert && (
                  <div className="alert-toast">
                    Poor posture sustained for a while — take a moment to reset.
                  </div>
                )}

                <div className="session-controls">
                  {!running ? (
                    <button className="btn btn-primary" onClick={startSession} disabled={ending}>
                      Start session
                    </button>
                  ) : (
                    <button className="btn btn-danger" onClick={endSession}>
                      End session &amp; get coaching
                    </button>
                  )}
                </div>
                {ending && <div className="empty-state">Getting your coaching report…</div>}
                {coachError && <div className="error-banner" style={{ marginTop: 14 }}>{coachError}</div>}
              </div>

              <div className="panel">
                <h3 className="panel-title">Spine gauge</h3>
                <SpineGauge spineAngle={reading.spine_angle} posture={reading.posture} />
                <h3 className="panel-title" style={{ marginTop: 22 }}>Score history</h3>
                <ScoreSparkline history={scoreHistory} />
              </div>
            </div>

            <CoachReport report={coachReport} stats={coachStats} />
          </>
        ) : (
          <div className="panel">
            <h3 className="panel-title">Past sessions</h3>
            <SessionHistory sessions={sessions} loading={sessionsLoading} error={sessionsError} />
          </div>
        )}
      </main>
    </div>
  );
}
