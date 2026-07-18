import { statusForPosture } from "../utils.js";

const COLORS = {
  good: "#5fbfa3",
  warn: "#e3a857",
  bad: "#d64550",
  neutral: "#8c96a8",
};

/**
 * Live side-profile spine indicator. Rotates around the hip pivot based on
 * the actual spine_angle value from the backend (180deg = perfectly upright,
 * lower = leaning forward). This is a visual approximation for legibility,
 * not an anatomically precise rendering — its job is to make an abstract
 * number ("162.4 degrees") immediately readable as a posture.
 */
export default function SpineGauge({ spineAngle, posture }) {
  const status = statusForPosture(posture);
  const color = COLORS[status];

  // 180deg (upright) -> 0deg tilt. Lower spine angle -> more forward lean.
  const tilt = spineAngle > 0 ? Math.min(Math.max(180 - spineAngle, 0), 42) : 0;

  return (
    <div className="spine-gauge-wrap">
      <svg viewBox="0 0 160 190" width="150" height="178">
        {/* seat */}
        <rect x="40" y="150" width="80" height="10" rx="3" fill="#2b3340" />
        <rect x="52" y="160" width="10" height="20" fill="#2b3340" />
        <rect x="98" y="160" width="10" height="20" fill="#2b3340" />

        {/* ghost reference line: ideal upright posture */}
        <line
          x1="80" y1="150" x2="80" y2="70"
          stroke="#8c96a8" strokeWidth="2" strokeDasharray="3 5" opacity="0.35"
        />

        {/* live torso + head, rotated around the hip pivot */}
        <g
          style={{ transformOrigin: "80px 150px", transition: "transform 0.35s ease" }}
          transform={`rotate(${-tilt} 80 150)`}
        >
          <line
            x1="80" y1="150" x2="80" y2="78"
            stroke={color} strokeWidth="5" strokeLinecap="round"
          />
          <circle cx="80" cy="65" r="14" fill={color} />
        </g>
      </svg>
      <span className="spine-gauge-caption">
        {spineAngle > 0 ? `${spineAngle.toFixed(1)}° spine angle` : "no reading yet"}
      </span>
    </div>
  );
}
