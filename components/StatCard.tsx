"use client";

import { ReactNode } from "react";
import { cn } from "../lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass flex flex-1 items-center justify-between gap-4 rounded-3xl border border-white/5 p-4",
        className
      )}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-300/80">{label}</p>
        <div className="text-2xl font-semibold text-white">{value}</div>
        {delta ? <p className="text-xs text-emerald-300/90">{delta}</p> : null}
      </div>
      {icon ? <div className="text-brand-light">{icon}</div> : null}
    </div>
  );
}
