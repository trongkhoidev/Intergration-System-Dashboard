"use client";

import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StatusChartProps {
  data: Record<string, number>;
  className?: string;
}

const COLORS = [
  "hsl(166, 76%, 47%)", // Primary/Success - Active
  "hsl(38, 92%, 50%)",  // Warning - On Leave
  "hsl(0, 84%, 60%)",   // Destructive - Inactive/Terminated
  "hsl(217, 91%, 60%)", // Info
];

export function StatusChart({ data, className }: StatusChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        className
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Employee Status
        </h3>
        <p className="text-sm text-muted-foreground">
          Distribution by employment status
        </p>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 7%)",
                  border: "1px solid hsl(0, 0%, 15%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                }}
                labelStyle={{ color: "hsl(0, 0%, 98%)", fontWeight: 600 }}
                itemStyle={{ color: "hsl(0, 0%, 64%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-foreground">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {entry.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({((entry.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
