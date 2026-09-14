import * as React from "react";

export function Badge({ className = "", variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "critical" | "high" | "medium" | "low" | "outline" | "emerald" | "neutral" }) {
  const variants: Record<string, string> = {
    default: "bg-[#0A0A0B] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
    critical: "bg-[#EF4444] text-white shadow-[0_1px_2px_rgba(239,68,68,0.2)]",
    high: "bg-[#F97316] text-white shadow-[0_1px_2px_rgba(249,115,22,0.2)]",
    medium: "bg-[#F59E0B] text-white shadow-[0_1px_2px_rgba(245,158,11,0.2)]",
    low: "bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]",
    outline: "border border-[#E4E4E7] text-[#52525B] bg-white",
    emerald: "bg-[#059669] text-white shadow-[0_1px_2px_rgba(5,150,105,0.2)]",
    neutral: "bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7]/80",
  };
  return <div className={`inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-[650] tracking-[-0.01em] transition-all ${variants[variant]} ${className}`} {...props} />;
}
