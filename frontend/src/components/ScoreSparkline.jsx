import { scoreColor } from "../utils.js";

const WIDTH = 280;
const HEIGHT = 60;

/** history: array of numbers (0-100), most recent last. */
export default function ScoreSparkline({ history }) {
  if (!history.length) {
    return <div className="empty-state">Score history will appear once the session starts.</div>;
  }

  const latest = history[history.length - 1];
  const color = { good: "#5fbfa3", warn: "#e3a857", bad: "#d64550" }[scoreColor(latest)];

  const points = history
    .slice(-40)
    .map((v, i, arr) => {
      const x = (i / Math.max(arr.length - 1, 1)) * WIDTH;
      const y = HEIGHT - (v / 100) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="sparkline-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="readout-label" style={{ marginTop: 4 }}>
        current score: <span style={{ color, fontFamily: "var(--font-mono)" }}>{latest}%</span>
      </div>
    </div>
  );
}
