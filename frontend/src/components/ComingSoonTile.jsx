import React from "react";
import { ShieldAlert } from "lucide-react";

export default function ComingSoonTile({ onClick }) {
  return (
    <div className="caregiver-locked-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--accent-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          <ShieldAlert size={17} />
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>Caregiver Mode</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Elderly & medical alert monitoring
          </div>
        </div>
      </div>

      <span className="badge-coming-soon">Coming Soon</span>
    </div>
  );
}
