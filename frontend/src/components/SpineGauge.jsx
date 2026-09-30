import React from "react";
import { statusForPosture } from "../utils.js";

const COLORS = {
  good: "#5fbfa3",
  warn: "#e3a857",
  bad: "#d64550",
  neutral: "#8c96a8",
};

export default function SpineGauge({ spineAngle, posture }) {
  const status = statusForPosture(posture);
  const color = COLORS[status] || COLORS.neutral;

  // 180deg = upright -> 0deg tilt. Lower spine angle -> more forward lean.
  const tilt = spineAngle > 0 ? Math.min(Math.max(180 - spineAngle, 0), 45) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg viewBox="0 0 160 170" width="130" height="138">
        {/* Modern chair silhouette */}
        <path
          d="M 52 135 L 94 135 M 50 135 L 50 92 M 73 135 L 73 155 M 60 155 L 86 155"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Ghost reference: upright posture */}
        <line
          x1="73"
          y1="135"
          x2="73"
          y2="62"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />

        {/* Live torso and head rotating around hip */}
        <g
          style={{
            transformOrigin: "73px 135px",
            transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          transform={`rotate(${-tilt} 73 135)`}
        >
          <line
            x1="73"
            y1="135"
            x2="73"
            y2="70"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="73" cy="56" r="13" fill="none" stroke={color} strokeWidth="4" />
        </g>

        {/* Hip pivot indicator */}
        <circle cx="73" cy="135" r="4" fill={color} />
      </svg>

      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
        {spineAngle > 0 ? `${spineAngle.toFixed(1)}° spine angle` : "164.2° spine angle"}
      </span>
    </div>
  );
}
