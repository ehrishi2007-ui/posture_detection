import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function TrendAreaChart({ data = [] }) {
  // Fallback demo data if no historical sessions yet
  const chartData = data.length
    ? data
    : [
        { day: "Mon", score: 65 },
        { day: "Tue", score: 72 },
        { day: "Wed", score: 68 },
        { day: "Thu", score: 82 },
        { day: "Fri", score: 75 },
        { day: "Sat", score: 85 },
        { day: "Sun", score: 78 },
      ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "rgba(18, 20, 26, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "8px 12px",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <div>{payload[0].payload.day}</div>
          <div style={{ color: "#c85a2a", fontWeight: "bold" }}>
            Score: {payload[0].value}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c85a2a" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#c85a2a" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            ticks={[0, 50, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={80}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeDasharray="3 3"
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#c85a2a"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#areaColor)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
