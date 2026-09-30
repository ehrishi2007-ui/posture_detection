import React from "react";
import { Footprints, Check, Coffee, X, Sparkles, Clock } from "lucide-react";

export default function BreakReminderModal({
  minutesSeated,
  onAcknowledge,
  onSnooze,
  onClose,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
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
          maxWidth: "480px",
          padding: "26px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65)",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="icon-btn"
          style={{ position: "absolute", top: "16px", right: "16px" }}
          title="Dismiss"
        >
          <X size={16} />
        </button>

        {/* Header with Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px var(--accent-glow)",
              flexShrink: 0,
            }}
          >
            <Footprints size={26} />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700 }}>
              Time to Stand Up &amp; Move!
            </h2>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
              Continuous seated time:{" "}
              <strong style={{ color: "var(--accent)" }}>{minutesSeated} minutes</strong>
            </div>
          </div>
        </div>

        {/* Ergonomic Stretch / Movement Tips */}
        <div
          style={{
            background: "var(--glass-raised)",
            border: "1px solid var(--glass-border-subtle)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "12.5px",
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "15px" }}>🚶</span>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>2-Minute Walk:</strong> Step away
              from your desk, hydrate with a glass of water, or walk around the room.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "15px" }}>🙆</span>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Overhead Spine Reach:</strong> Interlace
              your fingers, extend arms above your head, and gently lean side to side.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "15px" }}>👁️</span>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>20-20-20 Rule:</strong> Look at an
              object 20 feet away for 20 seconds to relieve ciliary eye muscle fatigue.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn-rust"
            onClick={onAcknowledge}
            style={{
              flex: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "11px 16px",
            }}
          >
            <Check size={16} />
            <span>I'm Up &amp; Moving (Reset)</span>
          </button>

          <button
            className="btn-outline"
            onClick={onSnooze}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "11px 14px",
            }}
          >
            <Coffee size={15} />
            <span>Snooze 10m</span>
          </button>
        </div>
      </div>
    </div>
  );
}
