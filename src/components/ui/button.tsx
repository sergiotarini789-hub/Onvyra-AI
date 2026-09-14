import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "emerald" | "subtle";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
}

export function Button({ className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-[13px] font-[600] tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 disabled:pointer-events-none disabled:opacity-50 btn-press focus-ring";
  const variants: Record<string, string> = {
    default: "bg-[#0A0A0B] text-white hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]",
    outline: "border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#0A0A0B] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    ghost: "hover:bg-[#F5F5F7] text-[#52525B] hover:text-[#0A0A0B]",
    secondary: "bg-[#F5F5F7] text-[#0A0A0B] hover:bg-[#EFEFF1] border border-transparent",
    emerald: "bg-[#059669] text-white hover:bg-[#047857] shadow-[0_1px_2px_rgba(16,185,129,0.2)] hover:shadow-[0_2px_8px_rgba(16,185,129,0.25)]",
    subtle: "bg-[#0A0A0B]/5 text-[#0A0A0B] hover:bg-[#0A0A0B]/10",
  };
  const sizes: Record<string, string> = {
    default: "h-[40px] px-[18px] py-2",
    xs: "h-[28px] rounded-[8px] px-3 text-[12px]",
    sm: "h-[34px] rounded-[8px] px-3.5 text-[12.5px]",
    lg: "h-[44px] rounded-[12px] px-[22px] text-[14px]",
    icon: "h-9 w-9 rounded-[10px]",
  };
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  return <button className={classes} {...props} />;
}
