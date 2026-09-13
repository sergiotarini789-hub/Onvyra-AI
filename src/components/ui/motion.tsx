"use client";
import { useEffect, useState, useRef } from "react";

// Count up animation
export function CountUp({ value, duration = 1200, prefix = "", suffix = "", className = "" }: { value: number; duration?: number; prefix?: string; suffix?: string; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }
    
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      hasAnimated.current = true;
      return;
    }

    let start = 0;
    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * value);
      setDisplay(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        hasAnimated.current = true;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span ref={ref} className={`font-mono-financial ${className}`}>{prefix}{display.toLocaleString("ru-RU")}{suffix}</span>;
}

// Scroll reveal wrapper
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}

// Stagger children
export function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

// Progress bar with shimmer
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setWidth(value);
      return;
    }
    const timer = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`h-[4px] w-full overflow-hidden rounded-full bg-[#F4F4F5] ${className}`}>
      <div
        className="h-full bg-[#0A0A0B] transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden"
        style={{ width: `${width}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

// Scanning animation
export function ScanningLine() {
  return (
    <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-[#F4F4F5]">
      <div className="absolute inset-y-0 w-[40%] bg-gradient-to-r from-transparent via-[#0A0A0B] to-transparent animate-[scan_1.5s_ease-in-out_infinite]" />
    </div>
  );
}
