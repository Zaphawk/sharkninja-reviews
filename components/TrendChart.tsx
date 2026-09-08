"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/aggregate";

export function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="#e8e9ea" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#5a5c5e" }}
            tickLine={false}
            axisLine={{ stroke: "#e8e9ea" }}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: "#5a5c5e" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #e8e9ea",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const point = item?.payload as TrendPoint | undefined;
              const avg = typeof value === "number" ? value.toFixed(2) : String(value);
              return [
                `${avg} / 5 · ${point?.n ?? 0} reviews`,
                "Verified average",
              ] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#00a5af"
            strokeWidth={2}
            dot={{ r: 3, fill: "#00a5af" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
