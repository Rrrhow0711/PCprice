"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPrice, retailerName } from "@/lib/format";

type ChartPoint = {
  date: string;
  coolpc?: number | null;
  sinya?: number | null;
};

export function ProductHistoryChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 12, bottom: 0 }}>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6f746f" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6f746f" }} tickFormatter={(value) => `$${value}`} width={68} />
          <Tooltip
            formatter={(value, name) => [formatPrice(Number(value)), retailerName(String(name))]}
            contentStyle={{ border: "1px solid #e7e4dd", borderRadius: 8, boxShadow: "0 12px 32px rgba(31,37,35,.08)" }}
          />
          <Line type="monotone" dataKey="coolpc" stroke="#0f766e" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="sinya" stroke="#475467" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
