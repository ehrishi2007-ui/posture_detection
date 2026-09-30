import React from "react";
import { Camera, Play, Activity, Square, ExternalLink, Clock } from "lucide-react";
import WebcamPanel from "../components/WebcamPanel.jsx";
import RadialScoreGauge from "../components/charts/RadialScoreGauge.jsx";
import TrendAreaChart from "../components/charts/TrendAreaChart.jsx";
import BreakdownDonut from "../components/charts/BreakdownDonut.jsx";
import RecentSessionsList from "../components/RecentSessionsList.jsx";
import AICoachCard from "../components/AICoachCard.jsx";
import ComingSoonTile from "../components/ComingSoonTile.jsx";
import SpineGauge from "../components/SpineGauge.jsx";
import { statusForPosture } from "../utils.js";

export default function DashboardPage({
  stats,
  recentSessions = [],
  onStartSession,
  onEndSession,
  onViewReport,
  onNavigateTab,
  stream,
  active = false,
  reading = {},
  sessionSeconds = 0,
}) {
  const todayScore = stats?.today_score ?? 78;
  const todaySessions = stats?.today_sessions ?? recentSessions.length ?? 3;
  const todayMonitored = stats?.today_monitored_min
    ? (stats.today_monitored_min / 60).toFixed(1)
    : "2.4";

  const currentPosture = active && reading.posture ? reading.posture : "Camera Idle";
  const statusTier = active && reading.posture ? statusForPosture(reading.posture) : "neutral";

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="dashboard-grid">
      {/* ─── COLUMN 1: Quick Status ─── */}
      <div className="dash-column">
        <div className="col-header">Quick Status</div>

        {/* Coordinated Camera Preview Tile */}
        <div className="glass-panel" style={{ padding: 14 }}>
          {active && stream ? (
            <WebcamPanel
              active={active}
              stream={stream}
              currentPosture={reading.posture}
            />
          ) : (
            <div className="camera-preview-box">
              <div className="camera-pulse-ring">
                <Camera size={26} />
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Camera ready
              </div>
            </div>
          )}
        </div>

        {/* Live / Status Badge */}
        <div className={`status-badge-large status-${statusTier}`}>
          <span className="status-dot-pulse" />
          <span>{currentPosture}</span>
        </div>

        {/* Spine Gauge Card */}
        <div className="glass-panel" style={{ padding: "16px 12px" }}>
          <SpineGauge
            spineAngle={active && reading.spine_angle ? reading.spine_angle : 164.2}
            posture={active && reading.posture ? reading.posture : "Good Posture"}
          />
        </div>

        {/* CTA Controls - Dynamic based on active session */}
        {active ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--good-dim)",
                border: "1px solid var(--good)",
                borderRadius: "10px",
                fontSize: "12.5px",
                color: "var(--good)",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="status-dot-pulse" style={{ background: "var(--good)" }} />
                <span>Monitoring Active</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)" }}>
                <Clock size={13} />
                <span>{formatTime(sessionSeconds)}</span>
              </div>
            </div>

            <button
              className="btn-rust"
              onClick={() => onNavigateTab("monitor")}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <ExternalLink size={15} />
              <span>Open Live Monitor</span>
            </button>

            <button
              className="btn-outline"
              onClick={onEndSession}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                borderColor: "rgba(224, 82, 82, 0.4)",
                color: "var(--bad, #E05252)",
              }}
            >
              <Square size={14} fill="currentColor" />
              <span>End Session &amp; Get Coaching</span>
            </button>
          </div>
        ) : (
          <button className="btn-rust" onClick={onStartSession} style={{ width: "100%" }}>
            <Play size={16} fill="currentColor" />
            <span>Start Session</span>
          </button>
        )}
      </div>

      {/* ─── COLUMN 2: Analytics ─── */}
      <div className="dash-column">
        <div className="col-header">Analytics</div>

        {/* Today's Score Radial Gauge Card */}
        <div className="glass-panel" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="chart-title">Today's Score</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Calculated from active sessions</span>
          </div>

          <RadialScoreGauge score={active && reading.score ? reading.score : todayScore} />

          {/* Metric Pills Row */}
          <div className="pills-row" style={{ marginTop: 12 }}>
            <div className="metric-pill">
              <Activity size={18} color="var(--accent)" />
              <div>
                <div className="metric-pill-val">{todaySessions}</div>
                <div className="metric-pill-label">sessions today</div>
              </div>
            </div>
            <div className="metric-pill">
              <Activity size={18} color="var(--good)" />
              <div>
                <div className="metric-pill-val">{todayMonitored} hrs</div>
                <div className="metric-pill-label">monitored</div>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend Chart Card */}
        <div className="glass-panel chart-box">
          <div className="chart-header-row">
            <span className="chart-title">7-Day Trend</span>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="chart-legend-badge">
                <span className="chart-legend-dot" style={{ background: "var(--accent)" }} />
                <span>Score</span>
              </div>
              <div className="chart-legend-badge">
                <span className="chart-legend-dot" style={{ background: "rgba(255,255,255,0.4)" }} />
                <span>Ideal (80%)</span>
              </div>
            </div>
          </div>

          <TrendAreaChart data={stats?.daily_scores} />
        </div>

        {/* Today's Breakdown Donut Card */}
        <div className="glass-panel chart-box">
          <div className="chart-header-row">
            <span className="chart-title">Today's Breakdown</span>
          </div>
          <BreakdownDonut breakdown={stats?.today_breakdown} />
        </div>
      </div>

      {/* ─── COLUMN 3: Recent Activity ─── */}
      <div className="dash-column dash-col-right">
        <div className="col-header">Recent Activity</div>

        {/* Recent Sessions List */}
        <div className="glass-panel recent-sessions-box">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span className="chart-title">Recent Sessions</span>
            <button
              onClick={() => onNavigateTab("history")}
              className="link-rust"
              style={{ background: "none", border: "none", fontSize: "11.5px" }}
            >
              View all
            </button>
          </div>

          <RecentSessionsList
            sessions={recentSessions}
            onSelectSession={() => onNavigateTab("history")}
          />
        </div>

        {/* Ergonomics AI Coach Card */}
        <AICoachCard
          coachReport={stats?.latest_coach_tip}
          onOpenReport={onViewReport}
        />

        {/* Coming Soon: Caregiver Telemetry Tile */}
        <ComingSoonTile onLearnMore={() => onNavigateTab("profiles")} />
      </div>
    </div>
  );
}
