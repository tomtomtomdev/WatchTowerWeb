"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HealthCheckResultData } from "@/lib/types";

interface ResponseTimeChartProps {
  results: HealthCheckResultData[];
}

export function ResponseTimeChart({ results }: ResponseTimeChartProps) {
  const chartData = useMemo(() => {
    return [...results]
      .reverse()
      .slice(-50)
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responseTime: Math.round(r.responseTime),
        success: r.isSuccess,
      }));
  }, [results]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border bg-card text-muted-foreground">
        No data yet. Run a health check to see response times.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(v) => `${v}ms`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value) => [`${value}ms`, "Response Time"]}
          />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
