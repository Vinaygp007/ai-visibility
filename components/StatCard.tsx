"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Tone = "accent" | "success" | "warning" | "danger" | "violet";

const TONE_STYLES: Record<Tone, { color: string; iconBg: string; iconBorder: string }> = {
  accent: { color: "var(--accent)", iconBg: "rgba(0,229,255,0.1)", iconBorder: "rgba(0,229,255,0.22)" },
  success: { color: "var(--success)", iconBg: "rgba(0,232,122,0.1)", iconBorder: "rgba(0,232,122,0.22)" },
  warning: { color: "var(--warning)", iconBg: "rgba(255,184,48,0.12)", iconBorder: "rgba(255,184,48,0.24)" },
  danger: { color: "var(--danger)", iconBg: "rgba(255,90,90,0.1)", iconBorder: "rgba(255,90,90,0.22)" },
  violet: { color: "var(--accent2)", iconBg: "rgba(124,111,255,0.12)", iconBorder: "rgba(124,111,255,0.24)" },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: Tone;
  trend?: { direction: "up" | "down"; value: string };
  caption?: string;
  loading?: boolean;
}

export default function StatCard({ icon: Icon, label, value, tone = "accent", trend, caption, loading }: StatCardProps) {
  const style = TONE_STYLES[tone];

  if (loading) {
    return (
      <div
        className="dash-stat-card rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="dash-skeleton h-3 w-20 rounded" />
          <div className="dash-skeleton w-8 h-8 rounded-lg" />
        </div>
        <div className="dash-skeleton h-7 w-16 rounded" />
        <div className="dash-skeleton h-4 w-24 rounded mt-3" />
      </div>
    );
  }

  return (
    <div
      className="dash-stat-card rounded-2xl border p-5"
      style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: style.iconBg, border: `1px solid ${style.iconBorder}`, color: style.color }}
        >
          <Icon size={15} />
        </div>
      </div>
      <div className="text-[26px] font-bold tracking-tight leading-none" style={{ color: "var(--text)" }}>{value}</div>
      {(trend || caption) && (
        <div className="flex items-center gap-2 mt-3">
          {trend && (
            <span
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                color: trend.direction === "up" ? "var(--success)" : "var(--danger)",
                background: trend.direction === "up" ? "rgba(0,232,122,0.1)" : "rgba(255,90,90,0.1)",
              }}
            >
              {trend.direction === "up" ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {trend.value}
            </span>
          )}
          {caption && <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>{caption}</span>}
        </div>
      )}
    </div>
  );
}
