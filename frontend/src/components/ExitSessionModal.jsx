import React from "react";
import { AlertCircle, Square, Eye, X, Power } from "lucide-react";

export default function ExitSessionModal({
  onEndSession,
  onEndAndExit,
  onContinueBackground,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.75)",
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
          maxWidth: "500px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65)",
          position: "relative",
          textAlign: "center",
        }}
      >
        {/* Close / Cancel Button */}
        <button
          onClick={onCancel}
          className="icon-btn"
          style={{ position: "absolute", top: "16px", right: "16px" }}
          title="Cancel"
        >
          <X size={16} />
        </button>

        {/* Alert Icon */}
        <div
          style={{
            width: "54px",
            height: "54px",
            borderRadius: "16px",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 2px",
            boxShadow: "0 0 24px var(--accent-glow)",
          }}
        >
          <AlertCircle size={28} />
        </div>

        {/* Content */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700 }}>
            Active Monitoring Session
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.5 }}>
            You have an active posture tracking session in progress. How would you like to handle this session?
          </p>
        </div>

        {/* Primary Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          {/* Option 1: Only close app, keep monitoring in background */}
          <button
            className="btn-rust"
            onClick={onContinueBackground}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "13px 18px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <Eye size={17} />
            <span>Close App Only (Keep Monitoring in Background)</span>
          </button>

          {/* Option 2: End session and see report */}
          <button
            className="btn-outline"
            onClick={onEndSession}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "12px 18px",
              fontSize: "13.5px",
            }}
          >
            <Square size={15} fill="currentColor" />
            <span>End Monitoring Session &amp; View Report</span>
          </button>

          {/* Option 3: End session and exit app completely */}
          {onEndAndExit && (
            <button
              onClick={onEndAndExit}
              style={{
                background: "rgba(224, 82, 82, 0.1)",
                border: "1px solid rgba(224, 82, 82, 0.3)",
                color: "var(--bad, #E05252)",
                borderRadius: "10px",
                padding: "10px 16px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Power size={14} />
              <span>End Session &amp; Exit Meru Completely</span>
            </button>
          )}

          {/* Cancel button */}
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "12.5px",
              cursor: "pointer",
              padding: "6px",
              marginTop: "4px",
            }}
          >
            Cancel &amp; Return to Session
          </button>
        </div>
      </div>
    </div>
  );
}
