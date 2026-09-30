import React, { useState } from "react";
import { Laptop, Video, ArrowRight, X } from "lucide-react";

export default function SetupGuideModal({ onComplete, onClose }) {
  const [cameraType, setCameraType] = useState(() => {
    return localStorage.getItem("meru_camera_type") || "integrated";
  });

  const [position, setPosition] = useState(() => {
    return localStorage.getItem("meru_camera_position") || "desk_low";
  });

  const handleSave = () => {
    localStorage.setItem("meru_camera_type", cameraType);
    localStorage.setItem("meru_camera_position", position);
    localStorage.setItem("meru_setup_completed", "true");
    onComplete(cameraType, position);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "620px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          position: "relative",
        }}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ position: "absolute", top: "18px", right: "18px" }}
            title="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Header */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700 }}>
            Camera &amp; Screen Placement
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "3px" }}>
            Select your setup to calibrate posture detection to your camera angle.
          </p>
        </div>

        {/* STEP 1: Camera Type */}
        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>
            Camera Type
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className={`btn-outline ${cameraType === "integrated" ? "active-setup-card" : ""}`}
              onClick={() => setCameraType("integrated")}
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                justifyContent: "flex-start",
                border: cameraType === "integrated" ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                background: cameraType === "integrated" ? "var(--accent-dim)" : "var(--glass)",
              }}
            >
              <Laptop size={18} color={cameraType === "integrated" ? "var(--accent)" : "var(--text-muted)"} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>Integrated Laptop Cam</span>
            </button>

            <button
              type="button"
              className={`btn-outline ${cameraType === "external" ? "active-setup-card" : ""}`}
              onClick={() => setCameraType("external")}
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                justifyContent: "flex-start",
                border: cameraType === "external" ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                background: cameraType === "external" ? "var(--accent-dim)" : "var(--glass)",
              }}
            >
              <Video size={18} color={cameraType === "external" ? "var(--accent)" : "var(--text-muted)"} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>External USB Webcam</span>
            </button>
          </div>
        </div>

        {/* STEP 2: Laptop Height & Angle using Eye Level & Camera Point */}
        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>
            Camera Position Relative to Eyes
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {/* 1. Below Eye Level (Desk) */}
            <div
              onClick={() => setPosition("desk_low")}
              style={{
                padding: "14px 10px",
                cursor: "pointer",
                borderRadius: "14px",
                border: position === "desk_low" ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                background: position === "desk_low" ? "var(--accent-dim)" : "var(--glass)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {/* Diagram 1: Camera below eye level */}
              <svg width="120" height="75" viewBox="0 0 120 75" fill="none">
                {/* Horizontal Eye-Level Reference Line */}
                <line x1="8" y1="20" x2="112" y2="20" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="12" y="15" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">Eye Level</text>
                
                {/* User Eye Point */}
                <circle cx="96" cy="20" r="5" fill="none" stroke="var(--text)" strokeWidth="1.5" />
                <circle cx="96" cy="20" r="2" fill="var(--text)" />

                {/* Camera Point below eye level */}
                <circle cx="26" cy="58" r="5" fill="var(--accent)" />
                <text x="26" y="70" fill="var(--accent)" fontSize="8" fontWeight="bold" textAnchor="middle">Cam</text>

                {/* Upward Line of Sight Arrow */}
                <path d="M 31 54 L 88 25" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                <polygon points="88,21 91,27 84,26" fill="var(--accent)" />
                <text x="56" y="48" fill="var(--accent)" fontSize="7.5" fontWeight="bold">Looking Up</text>
              </svg>

              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 700 }}>Below Eye Level</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Laptop flat on desk
                </div>
              </div>
            </div>

            {/* 2. At Eye Level (Stand) */}
            <div
              onClick={() => setPosition("stand_eye")}
              style={{
                padding: "14px 10px",
                cursor: "pointer",
                borderRadius: "14px",
                border: position === "stand_eye" ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                background: position === "stand_eye" ? "var(--accent-dim)" : "var(--glass)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {/* Diagram 2: Camera at eye level */}
              <svg width="120" height="75" viewBox="0 0 120 75" fill="none">
                {/* Horizontal Eye-Level Reference Line */}
                <line x1="8" y1="38" x2="112" y2="38" stroke="var(--good)" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="12" y="32" fill="var(--good)" fontSize="8.5" fontFamily="var(--font-mono)">Eye Level</text>

                {/* User Eye Point */}
                <circle cx="96" cy="38" r="5" fill="none" stroke="var(--text)" strokeWidth="1.5" />
                <circle cx="96" cy="38" r="2" fill="var(--text)" />

                {/* Camera Point exactly on eye line */}
                <circle cx="26" cy="38" r="5" fill="var(--good)" />
                <text x="26" y="52" fill="var(--good)" fontSize="8" fontWeight="bold" textAnchor="middle">Cam</text>

                {/* Direct Horizontal Line of Sight */}
                <path d="M 32 38 L 88 38" stroke="var(--good)" strokeWidth="2" strokeLinecap="round" />
                <polygon points="88,35 91,38 88,41" fill="var(--good)" />
                <text x="58" y="32" fill="var(--good)" fontSize="7.5" fontWeight="bold">Direct (0°)</text>
              </svg>

              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 700 }}>At Eye Level</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Laptop on riser / stand
                </div>
              </div>
            </div>

            {/* 3. Above Eye Level (Monitor Top) */}
            <div
              onClick={() => setPosition("monitor_high")}
              style={{
                padding: "14px 10px",
                cursor: "pointer",
                borderRadius: "14px",
                border: position === "monitor_high" ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                background: position === "monitor_high" ? "var(--accent-dim)" : "var(--glass)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {/* Diagram 3: Camera above eye level */}
              <svg width="120" height="75" viewBox="0 0 120 75" fill="none">
                {/* Horizontal Eye-Level Reference Line */}
                <line x1="8" y1="56" x2="112" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="12" y="70" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-mono)">Eye Level</text>

                {/* User Eye Point */}
                <circle cx="96" cy="56" r="5" fill="none" stroke="var(--text)" strokeWidth="1.5" />
                <circle cx="96" cy="56" r="2" fill="var(--text)" />

                {/* Camera Point above eye level */}
                <circle cx="26" cy="18" r="5" fill="var(--accent)" />
                <text x="26" y="10" fill="var(--accent)" fontSize="8" fontWeight="bold" textAnchor="middle">Cam</text>

                {/* Downward Line of Sight Arrow */}
                <path d="M 31 22 L 88 52" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                <polygon points="85,55 91,54 88,48" fill="var(--accent)" />
                <text x="56" y="32" fill="var(--accent)" fontSize="7.5" fontWeight="bold">Looking Down</text>
              </svg>

              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 700 }}>Above Eye Level</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Webcam on top of monitor
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
          <button className="btn-rust" onClick={handleSave} style={{ width: "100%", padding: "12px" }}>
            <span>Confirm Setup &amp; Start</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
