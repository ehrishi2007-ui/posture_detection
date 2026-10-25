import React, { useState } from "react";
import { Sparkles, Clock, X, CheckCircle2, ChevronRight, FileDown } from "lucide-react";
import { scoreColor } from "../utils.js";
import { exportSessionPDF } from "../utils/pdfExport.js";

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionHistory({ sessions, loading, error }) {
  const [selectedSession, setSelectedSession] = useState(null);

  if (loading) return <div className="empty-state">Loading session history…</div>;
  if (error) return <div className="error-banner">Could not load session history: {error}</div>;
  if (!sessions || !sessions.length) {
    return (
      <div className="empty-state">
        No sessions recorded yet. Complete a live monitoring session to see your historical trends here.
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          className="history-table"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 8px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <th style={{ padding: "12px 18px", width: "22%" }}>Date &amp; Time</th>
              <th style={{ padding: "12px 18px", width: "14%" }}>Score</th>
              <th style={{ padding: "12px 18px", width: "14%" }}>Duration</th>
              <th style={{ padding: "12px 18px", width: "24%" }}>Primary Posture</th>
              <th style={{ padding: "12px 18px", width: "26%", textAlign: "right" }}>AI Coaching Analysis</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const status = scoreColor(s.score);
              const hasReport = Boolean(s.ai_report && s.ai_report.trim().length > 0);

              return (
                <tr
                  key={s.id}
                  className="history-row"
                  onClick={() => setSelectedSession(s)}
                  style={{
                    background: "var(--glass)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  <td style={{ padding: "16px 18px", borderTopLeftRadius: "12px", borderBottomLeftRadius: "12px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{formatTimestamp(s.timestamp)}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.label || "Manual Session"}</div>
                  </td>

                  <td style={{ padding: "16px 18px" }}>
                    <span
                      className={`session-badge status-${status}`}
                      style={{ padding: "5px 12px", fontSize: "13px", fontWeight: 700 }}
                    >
                      {s.score}%
                    </span>
                  </td>

                  <td style={{ padding: "16px 18px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    {s.duration_min ? `${s.duration_min.toFixed(1)} min` : "1 min"}
                  </td>

                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{s.top_issue || "Good Posture"}</div>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "var(--text-muted)",
                        maxWidth: "260px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.tip || "Keep up the great posture"}
                    </div>
                  </td>

                  <td style={{ padding: "16px 18px", textAlign: "right", borderTopRightRadius: "12px", borderBottomRightRadius: "12px" }}>
                    <button
                      className="btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSession(s);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        fontSize: "12px",
                        background: hasReport ? "var(--accent-dim)" : "var(--glass-raised)",
                        borderColor: hasReport ? "var(--accent)" : "var(--glass-border)",
                        color: hasReport ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{hasReport ? "View AI Report" : "View Details"}</span>
                      <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail & AI Coaching Modal */}
      {selectedSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedSession(null)}
              className="icon-btn"
              style={{ position: "absolute", top: "18px", right: "18px" }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Session Record #{selectedSession.id}
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "19px", fontWeight: 700, marginTop: "2px" }}>
                {formatTimestamp(selectedSession.timestamp)}
              </h2>
            </div>

            {/* Stat Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div className="glass-panel" style={{ padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>SCORE</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--good)", fontFamily: "var(--font-display)" }}>
                  {selectedSession.score}%
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>DURATION</div>
                <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                  {selectedSession.duration_min ? `${selectedSession.duration_min.toFixed(1)}m` : "1m"}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>AVG SPINE</div>
                <div style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                  {selectedSession.avg_spine_deg ? `${selectedSession.avg_spine_deg.toFixed(1)}°` : "160°"}
                </div>
              </div>
            </div>

            {/* Gemini AI Coaching Analysis */}
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "10px" }}>
                <Sparkles size={18} color="var(--accent)" />
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "14.5px", fontWeight: 600 }}>
                  Gemini Ergonomic Coach Analysis
                </h3>
              </div>

              <div
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.65,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-body)",
                }}
              >
                {selectedSession.ai_report && selectedSession.ai_report.trim().length > 0 ? (
                  selectedSession.ai_report
                ) : (
                  <div>
                    <p style={{ marginBottom: "10px" }}>
                      <strong>Primary Observation:</strong> {selectedSession.top_issue || "Good Posture"}
                    </p>
                    <p style={{ color: "var(--text-muted)" }}>
                      <strong>Corrective Advice:</strong> {selectedSession.tip || "Maintain your neutral spine alignment and take short 20-second gaze breaks."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                className="btn-outline"
                onClick={() =>
                  exportSessionPDF({
                    stats: selectedSession,
                    report: selectedSession.ai_report || selectedSession.tip,
                    timestamp: selectedSession.timestamp,
                    userName: "Rishitha",
                    sessionId: selectedSession.id,
                  })
                }
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <FileDown size={15} color="var(--accent)" />
                <span>Download PDF Report</span>
              </button>

              <button className="btn-rust" onClick={() => setSelectedSession(null)}>
                <CheckCircle2 size={15} />
                <span>Close Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
