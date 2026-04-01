import React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-blue-700 via-blue-600 to-teal-600 text-white hover:from-blue-800 hover:via-blue-700 hover:to-teal-700 shadow-[0_14px_34px_rgba(29,78,216,0.30)]",
  secondary: "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] text-slate-900 border border-blue-100 hover:border-blue-200 hover:bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]",
  ghost: "bg-transparent text-slate-600 hover:bg-blue-50/75 hover:text-blue-700",
  success: "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white hover:from-emerald-800 hover:to-emerald-700 shadow-[0_14px_34px_rgba(22,163,74,0.25)]",
  danger: "bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700 shadow-[0_14px_34px_rgba(220,38,38,0.24)]",
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
        "inline-flex items-center justify-center gap-2 font-black uppercase tracking-[0.14em] transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}