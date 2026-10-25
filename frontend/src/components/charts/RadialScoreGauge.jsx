import React from "react";

export default function RadialScoreGauge({ score = 0 }) {
  const radius = 70;
  const strokeWidth = 14;
  // Semicircle arc (180 degrees)
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = Math.PI * normalizedRadius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="score-gauge-card">
      <svg width="180" height="105" viewBox="0 0 180 105">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c85a2a" />
            <stop offset="100%" stopColor="#ff7a45" />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="rgba(255, 255, 255, 0.09)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Animated Active Progress Arc */}
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{ marginTop: "-20px", textAlign: "center" }}>
        <span className="score-number-big">{clampedScore}%</span>
        <div className="score-subtitle">Posture Score</div>
      </div>
    </div>
  );
}
