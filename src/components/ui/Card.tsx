import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[2rem] border border-blue-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.93))] shadow-[0_18px_40px_rgba(15,23,42,0.06)]", className)} {...props} />;
}

export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[2rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.78))] shadow-[0_22px_46px_rgba(15,23,42,0.07)] backdrop-blur-[16px]", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-black tracking-[-0.03em] text-slate-950", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm font-medium leading-relaxed text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />;
}