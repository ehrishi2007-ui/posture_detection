import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AICoachCard({ report, onViewReport }) {
  const fallbackText =
    "Great work maintaining an upright posture during your recent sessions! Focus on keeping your screen at eye level and relaxing your shoulders.";

  const excerpt = report || fallbackText;

  return (
    <div className="glass-panel ai-coach-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={15} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: "13px", fontFamily: "var(--font-display)" }}>
            AI Ergonomic Coach
          </span>
        </div>
        <span style={{ fontSize: "10.5px", color: "var(--text-muted)", background: "var(--glass-raised)", padding: "2px 6px", borderRadius: "6px" }}>
          Gemini
        </span>
      </div>

      <p className="ai-coach-excerpt">{excerpt}</p>

      <div style={{ marginTop: "2px" }}>
        <button
          onClick={onViewReport}
          className="link-rust"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <span>See full coaching report</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
