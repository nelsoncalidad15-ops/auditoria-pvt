import React from "react";
import { cn } from "../../lib/utils";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-emerald-50/90 text-emerald-700 border-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  warning: "bg-amber-50/90 text-amber-700 border-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  danger: "bg-red-50/90 text-red-700 border-red-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  neutral: "bg-slate-100/90 text-slate-600 border-slate-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  info: "bg-blue-50/90 text-blue-700 border-blue-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ className, tone = "neutral", ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}