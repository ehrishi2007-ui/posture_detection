import React from "react";
import WebcamPanel from "../components/WebcamPanel.jsx";
import SpineGauge from "../components/SpineGauge.jsx";
import RadialScoreGauge from "../components/charts/RadialScoreGauge.jsx";
import ScoreSparkline from "../components/ScoreSparkline.jsx";
import { Play, Square, AlertTriangle, Clock, Target, Check } from "lucide-react";
import { statusForPosture } from "../utils.js";

export default function LiveMonitorPage({
  active,
  reading,
  scoreHistory,
  analyzeError,
  showAlert,
  onStartSession,
  onEndSession,
  ending,
  stream,
  cameraError,
  sessionSeconds = 0,
  onCalibrate,
  calibratedMsg,
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const statusTier = statusForPosture(reading.posture);

  return (
    <div className="live-session-view">
      {/* Left Column: Camera & Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: active ? "var(--good)" : "var(--neutral)",
                  boxShadow: active ? "0 0 10px var(--good)" : "none",
                }}
              />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px" }}>
                {active ? "Live Monitoring Active" : "Camera Idle"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                background: "var(--glass-raised)",
                padding: "4px 10px",
                borderRadius: "8px",
              }}
            >
              <Clock size={13} color="var(--accent)" />
              <span>{formatTime(sessionSeconds)}</span>
            </div>
          </div>

          {/* Webcam View */}
          <WebcamPanel
            active={active}
            stream={stream}
            currentPosture={reading.posture}
            error={cameraError}
          />

          {/* Error Banner */}
          {analyzeError && (
            <div className="alert-toast-box" style={{ marginTop: 14 }}>
              {analyzeError}
            </div>
          )}

          {/* Sustained Alert Banner */}
          {showAlert && (
            <div className="alert-toast-box" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={17} />
              <span>Poor posture sustained for over 10 seconds. Take a moment to adjust!</span>
            </div>
          )}

          {/* Low Light Warning */}
          {reading.low_light && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 14px",
                borderRadius: "10px",
                background: "var(--warn-dim)",
                border: "1px solid var(--warn)",
                color: "var(--warn)",
                fontSize: "12px",
              }}
            >
              Lighting is dim — Meru is applying CLAHE contrast enhancement to assist detection.
            </div>
          )}

          {/* Tip Banner */}
          {reading.tip && (
            <div
              className={`tip-banner status-${statusTier}`}
              style={{
                marginTop: 14,
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13.5px",
                background: "var(--glass-raised)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <strong>Tip: </strong> {reading.tip}
            </div>
          )}

          {/* Control Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            {!active ? (
              <button className="btn-rust" onClick={onStartSession} disabled={ending} style={{ flex: 1 }}>
                <Play size={16} fill="currentColor" />
                <span>Start Monitoring</span>
              </button>
            ) : (
              <>
                <button
                  className="btn-outline"
                  onClick={onCalibrate}
                  title="Sit upright and click to calibrate this as your neutral reference"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Target size={15} color="var(--accent)" />
                  <span>Calibrate Baseline</span>
                </button>
                <button className="btn-rust btn-danger" onClick={onEndSession} disabled={ending} style={{ flex: 1 }}>
                  <Square size={16} fill="currentColor" />
                  <span>End Session &amp; Get Coaching</span>
                </button>
              </>
            )}
          </div>

          {calibratedMsg && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 14px",
                borderRadius: "10px",
                background: "var(--good-dim)",
                border: "1px solid var(--good)",
                color: "var(--good)",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <Check size={15} />
              <span>Calibrated! Your current sitting posture is saved as your neutral baseline.</span>
            </div>
          )}

          {ending && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", marginTop: 12 }}>
              Consulting AI Ergonomics Coach with your session data…
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Gauges & Metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Spine Gauge Panel */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", marginBottom: 10 }}>
            Real-time Spine Gauge
          </div>
          <SpineGauge spineAngle={reading.spine_angle} posture={reading.posture} />
        </div>

        {/* Live Score Radial Gauge */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", marginBottom: 6 }}>
            Rolling Score
          </div>
          <RadialScoreGauge score={reading.score || 0} />
        </div>

        {/* Score History Sparkline */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", marginBottom: 10 }}>
            Recent Score History
          </div>
          <ScoreSparkline history={scoreHistory} />
        </div>
      </div>
    </div>
  );
}
