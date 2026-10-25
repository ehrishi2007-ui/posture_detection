import React from "react";
import { scoreColor } from "../utils.js";

export default function RecentSessionsList({ sessions = [], onSelectSession }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "12px 4px" }}>
        No sessions logged yet today.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {sessions.slice(0, 4).map((s) => {
        const status = scoreColor(s.score);
        const time = new Date(s.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={s.id}
            className="session-row-item"
            onClick={() => onSelectSession && onSelectSession(s)}
            style={{ cursor: "pointer" }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "12.5px" }}>{time}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {s.duration_min ? `${s.duration_min.toFixed(1)} min` : "1 min"} · {s.top_issue || "Good"}
              </div>
            </div>

            <span className={`session-badge status-${status}`}>
              {s.score}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
