export default function CoachReport({ report, stats }) {
  if (!report) return null;

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3 className="panel-title">Coaching report</h3>

      <div className="stat-grid">
        <Stat label="Score" value={`${stats.score}%`} />
        <Stat label="Duration" value={`${stats.duration_min.toFixed(1)} min`} />
        <Stat label="Avg spine angle" value={`${stats.avg_spine_deg.toFixed(1)}°`} />
        <Stat label="Worst streak" value={`${stats.worst_streak} fr`} />
      </div>

      <p className="report-text">{report}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="readout">
      <div className="readout-label">{label}</div>
      <div className="readout-value">{value}</div>
    </div>
  );
}
