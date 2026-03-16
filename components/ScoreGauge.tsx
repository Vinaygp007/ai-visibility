"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  value: string | number;
  label: string;
  color: string;
  fillPercent?: number;
}

export default function ScoreGauge({ value, label, color, fillPercent }: ScoreGaugeProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(fillPercent ?? 100), 100);
    return () => clearTimeout(timer);
  }, [fillPercent]);

  return (
    <div
      className="rounded-2xl border p-7 text-center min-w-[170px]"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="text-5xl font-bold tracking-tighter leading-none"
        style={{ color }}
      >
        {value}
      </div>
      <div
        className="text-[12px] font-mono mt-1.5 tracking-widest"
        style={{ color: "#8b8d9e" }}
      >
        {label}
      </div>
      <div
        className="w-full h-1 rounded-sm mt-3 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <div
          className="h-full rounded-sm score-fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}
