import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { postureColor, postureShortLabel } from "../../utils.js";

export default function BreakdownDonut({ breakdown = {} }) {
  // Convert breakdown object into chart data items
  const data = Object.entries(breakdown)
    .filter(([_, count]) => count > 0)
    .map(([label, count]) => ({
      name: postureShortLabel(label),
      fullName: label,
      value: count,
      color: postureColor(label),
    }));

  // Fallback demo breakdown if no sessions recorded today
  const chartData = data.length
    ? data
    : [
        { name: "Good", fullName: "Good Posture", value: 68, color: "#5FBFA3" },
        { name: "Slouching", fullName: "Slouching", value: 16, color: "#D64550" },
        { name: "Leaning", fullName: "Leaning Forward", value: 10, color: "#C85A2A" },
        { name: "Shoulder", fullName: "Shoulder Tilt", value: 6, color: "#E3A857" },
      ];

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0) || 1;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 110, height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(val, name) => [`${Math.round((val / total) * 100)}%`, name]}
              contentStyle={{
                background: "rgba(18, 20, 26, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fff",
              }}
            />
            <Pie
              data={chartData}
              innerRadius={32}
              outerRadius={50}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {chartData.slice(0, 4).map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--text-muted)" }}>{item.name}</span>
            </div>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
