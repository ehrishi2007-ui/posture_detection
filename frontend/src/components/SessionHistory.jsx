import { scoreColor } from "../utils.js";

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SessionHistory({ sessions, loading, error }) {
  if (loading) return <div className="empty-state">Loading session history…</div>;
  if (error) return <div className="error-banner">Could not load session history: {error}</div>;
  if (!sessions.length) {
    return (
      <div className="empty-state">
        No sessions recorded yet. End a live session to save your first one here.
      </div>
    );
  }

  return (
    <table className="history-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Score</th>
          <th>Duration</th>
          <th>Top issue</th>
          <th>Tip</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => {
          const status = scoreColor(s.score);
          return (
            <tr key={s.id}>
              <td style={{ fontFamily: "var(--font-body)" }}>{formatTimestamp(s.timestamp)}</td>
              <td>
                <span className={`badge status-${status}`}>{s.score}%</span>
              </td>
              <td>{s.duration_min.toFixed(1)} min</td>
              <td style={{ fontFamily: "var(--font-body)" }}>{s.top_issue}</td>
              <td style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)" }}>{s.tip}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
