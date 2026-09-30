import React, { useEffect, useRef } from "react";
import { statusForPosture } from "../utils.js";
import { Camera } from "lucide-react";

/**
 * Renders the live mirrored webcam feed and posture status badge.
 * Receives the persistent camera stream from App.jsx so monitoring
 * is never interrupted by navigating between tabs.
 */
export default function WebcamPanel({ active, currentPosture, stream, error }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const status = statusForPosture(currentPosture);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 3",
        borderRadius: "14px",
        overflow: "hidden",
        background: "#000",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          display: stream ? "block" : "none",
        }}
      />

      {/* Fallback placeholder when camera is not yet active */}
      {!stream && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            color: "var(--text-muted)",
          }}
        >
          <Camera size={32} />
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>
            {error || (active ? "Starting camera stream…" : "Camera idle")}
          </span>
        </div>
      )}

      {/* Live posture status badge pinned to bottom of camera frame */}
      {active && currentPosture && (
        <div
          className={`status-badge-large status-${status}`}
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            padding: "6px 12px",
            fontSize: "12.5px",
            background: "rgba(10, 10, 10, 0.82)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: "10px",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span className="status-dot-pulse" />
          <span>{currentPosture}</span>
        </div>
      )}
    </div>
  );
}
