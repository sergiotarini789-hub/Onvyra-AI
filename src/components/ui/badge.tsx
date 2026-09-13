import * as React from "react";

export function Badge({ className = "", variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "critical" | "high" | "medium" | "low" | "outline" }) {
  const variants: Record<string, string> = {
    default: "bg-slate-900 text-white",
    critical: "bg-red-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-slate-200 text-slate-700",
    outline: "border border-slate-200 text-slate-700 bg-white",
  };
  return <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`} {...props} />;
}
