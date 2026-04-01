import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { GlassCard } from "./Card";

interface KpiCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "slate" | "blue" | "emerald" | "amber" | "red";
}

export function KpiCard({ label, value, detail, icon: Icon, tone = "slate" }: KpiCardProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{detail}</p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            tone === "slate" && "bg-slate-900 text-white border-slate-800",
            tone === "blue" && "bg-blue-50 text-blue-700 border-blue-100",
            tone === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-100",
            tone === "amber" && "bg-amber-50 text-amber-700 border-amber-100",
            tone === "red" && "bg-red-50 text-red-700 border-red-100",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </GlassCard>
  );
}