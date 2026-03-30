import React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-[0_14px_34px_rgba(37,99,235,0.28)]",
  secondary: "bg-white/90 text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100/80",
  success: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-[0_14px_34px_rgba(21,128,61,0.22)]",
  danger: "bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-[0_14px_34px_rgba(220,38,38,0.2)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2.5 text-[11px] rounded-xl",
  md: "px-4.5 py-3 text-xs rounded-2xl",
  lg: "px-5.5 py-3.5 text-sm rounded-2xl",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-black uppercase tracking-[0.16em] transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}