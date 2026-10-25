import React from "react";
import { Lock, HeartPulse, BellRing, Users } from "lucide-react";

export default function ComingSoonPage({ onBackToDashboard }) {
  return (
    <div style={{ maxWidth: 740, margin: "20px auto", display: "flex", flexDirection: "column", gap: 24, textAlign: "center" }}>
      <div className="glass-panel" style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            background: "var(--accent-dim)",
            border: "1px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            marginBottom: 20,
            boxShadow: "0 0 24px var(--accent-glow)",
          }}
        >
          <Lock size={32} />
        </div>

        <span className="badge-coming-soon" style={{ marginBottom: 14 }}>
          In Progress
        </span>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 700, marginBottom: 10 }}>
          Caregiver &amp; Medical Alert Mode
        </h1>

        <p style={{ color: "var(--text-muted)", fontSize: "14.5px", maxWidth: 520, lineHeight: 1.6, marginBottom: 30 }}>
          We are expanding VitalFrame beyond desk ergonomics to provide non-intrusive posture and fall-risk monitoring for elderly individuals and patients requiring remote assistive care.
        </p>

        {/* Feature Preview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, width: "100%", textAlign: "left", marginBottom: 32 }}>
          <div className="glass-panel" style={{ padding: 16 }}>
            <HeartPulse size={20} color="var(--accent)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: "13px" }}>Health Slump Alerts</div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4 }}>
              Alert caregivers if an elderly individual is severely slouched or unresponsive.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 16 }}>
            <Users size={20} color="var(--good)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: "13px" }}>Multi-Profile Hub</div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4 }}>
              Manage multiple family members or patients from a single desktop dashboard.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 16 }}>
            <BellRing size={20} color="var(--warn)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: "13px" }}>Critical Notifications</div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4 }}>
              High-priority audio alerts and desktop dispatch for emergency assistance.
            </div>
          </div>
        </div>

        <button className="btn-rust" onClick={onBackToDashboard}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
