"use client";

import { ReactNode } from "react";
import { cn } from "../lib/utils";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  subtitle?: string;
  id?: string;
}

export function SectionCard({
  title,
  action,
  children,
  className,
  subtitle,
  id
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={cn(
        "glass rounded-3xl border border-white/10 p-5 shadow-lg",
        className
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-300/80">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="space-y-4 text-sm text-slate-100/90">{children}</div>
    </section>
  );
}
