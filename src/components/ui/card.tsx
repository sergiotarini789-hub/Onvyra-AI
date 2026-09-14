import * as React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[16px] border border-[#E5E7EB]/80 bg-white shadow-premium hover-lift ${className}`} {...props} />;
}
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-[22px] ${className}`} {...props} />;
}
export function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-[14px] font-[650] leading-none tracking-[-0.015em] text-[#0A0A0B] ${className}`} {...props} />;
}
export function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-[13px] text-[#71717A] leading-[1.5] ${className}`} {...props} />;
}
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-[22px] pt-0 ${className}`} {...props} />;
}
export function CardFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-[22px] pt-0 ${className}`} {...props} />;
}

// Premium dark card for dashboard
export function CardDark({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[16px] border border-white/[0.08] bg-[#0A0A0B] text-white shadow-premium-dark ${className}`} {...props} />;
}
