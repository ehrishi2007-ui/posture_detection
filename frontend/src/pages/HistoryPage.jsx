import React from "react";
import SessionHistory from "../components/SessionHistory.jsx";
import { FileDown, RefreshCw } from "lucide-react";
import { exportAllSessionsSummaryPDF } from "../utils/pdfExport.js";

export default function HistoryPage({ sessions, loading, error, onRefresh }) {
  const handleDownloadAll = () => {
    if (!sessions || sessions.length === 0) return;
    exportAllSessionsSummaryPDF({
      sessions,
      userName: "Rishitha",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700 }}>
            Session History &amp; Records
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: 2 }}>
            Review past monitoring intervals, scores, and corrective tips
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn-outline"
            onClick={handleDownloadAll}
            disabled={!sessions || sessions.length === 0}
            title="Download a consolidated PDF report of all logged sessions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: !sessions || sessions.length === 0 ? 0.4 : 1,
            }}
          >
            <FileDown size={15} color="var(--accent)" />
            <span>Download All as Summary PDF</span>
          </button>

          <button className="btn-outline" onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
            <span>Refresh History</span>
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 20 }}>
        <SessionHistory sessions={sessions} loading={loading} error={error} />
      </div>
    </div>
  );
}
