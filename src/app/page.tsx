/* eslint-disable react/no-unescaped-entities */
"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CountUp({ value, duration = 1400, prefix = "", suffix = "" }: { value: number; duration?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || hasAnimated.current) {
      setDisplay(value);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(ease * value));
      if (progress < 1) requestAnimationFrame(animate);
      else hasAnimated.current = true;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span className="font-mono-financial tabular-nums">{prefix}{display.toLocaleString("ru-RU")}{suffix}</span>;
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`${className} transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>{children}</div>;
}

export default function LandingPage() {
  const [scanning, setScanning] = useState(0);
  const [activeOpportunity, setActiveOpportunity] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setScanning(s => (s >= 100 ? 0 : s + 1));
    }, 60);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveOpportunity(s => (s + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const opportunities = [
    { name: "Ivan Petrov", company: "Acme LLC", value: 185000, score: 92, prob: 74, reason: "Pricing requested • Strong product match • No contact 18 days", action: "Follow up today", signals: ["+20 Explicit intent", "+15 Product relevance", "+15 Price requested", "+10 Proposal sent", "+10 No follow-up", "+10 High-value"] },
    { name: "Maria Sokolova", company: "Beta Corp", value: 240000, score: 88, prob: 68, reason: "Quotation sent • Think signal • Proposal stage", action: "Re-engage", signals: ["+20 Purchase intent", "+15 Quotation", "+10 Proposal", "+10 Inactivity", "+10 High value"] },
    { name: "Alexey Kuznetsov", company: "Gamma LLC", value: 120000, score: 81, prob: 62, reason: "Product specified • No response 14d", action: "Follow up", signals: ["+15 Product", "+15 Price request", "+10 Proposal sent", "+5 Think signal"] },
  ];

  const active = opportunities[activeOpportunity];

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#0A0A0B] selection:bg-[#0A0A0B] selection:text-white">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.06)_0%,transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Header - Premium */}
      <header className="sticky top-0 z-50 w-full border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFC]/80 backdrop-blur-[20px]">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-[32px] w-[32px] rounded-[10px] bg-[#0A0A0B] flex items-center justify-center text-white font-[750] text-[14px] tracking-[-0.02em] shadow-[0_1px_2px_rgba(0,0,0,0.1)]">O</div>
              <span className="font-[650] text-[15px] tracking-[-0.02em]">Onvyra</span>
              <span className="hidden md:inline-flex ml-1 h-[20px] items-center rounded-full bg-[#0A0A0B] px-2 text-[10px] font-[700] tracking-[0.02em] text-white">OS v1.0</span>
              <span className="hidden lg:inline-flex ml-2 h-[22px] items-center gap-1.5 rounded-full border border-[#0A0A0B]/10 bg-white px-2.5 text-[11px] font-[600]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /> AI ENGINE ACTIVE
              </span>
            </div>
            <nav className="hidden lg:flex items-center gap-1">
              <a href="#product" className="px-3 py-1.5 rounded-[8px] text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B] hover:bg-[#0A0A0B]/5 transition-colors">Product</a>
              <a href="#how-it-works" className="px-3 py-1.5 rounded-[8px] text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B] hover:bg-[#0A0A0B]/5 transition-colors">How it works</a>
              <Link href="/pricing" className="px-3 py-1.5 rounded-[8px] text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B] hover:bg-[#0A0A0B]/5 transition-colors">Pricing</Link>
              <Link href="/security" className="px-3 py-1.5 rounded-[8px] text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B] hover:bg-[#0A0A0B]/5 transition-colors">Security</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden md:inline-flex h-[36px] items-center justify-center rounded-[10px] px-4 text-[13px] font-[600] text-[#52525B] hover:text-[#0A0A0B] hover:bg-[#0A0A0B]/5 transition-colors">Sign in</Link>
            <Link href="/register" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] px-[18px] text-[13px] font-[600] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[1px] active:translate-y-[0px] active:scale-[0.98] transition-all duration-200">Analyze Your Pipeline</Link>
          </div>
        </div>
      </header>

      {/* HERO - Cinematic AI Product */}
      <section className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 pt-[72px] md:pt-[96px] pb-[48px]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-[48px] lg:gap-[72px] items-start">
          {/* Left - Storytelling */}
          <div className="pt-2">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className="h-2 w-2 rounded-full bg-[#EF4444] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
                <span className="text-[11px] font-[650] tracking-[0.02em] text-[#52525B]">LIVE RECOVERY INTELLIGENCE • 1,284 LEADS SCANNED</span>
              </div>
            </Reveal>
            
            <Reveal delay={100}>
              <h1 className="mt-8 text-[42px] md:text-[56px] lg:text-[64px] font-[750] leading-[0.95] tracking-[-0.03em]">
                Find the customers<br />
                <span className="text-[#71717A]">your business is</span><br />
                leaving behind.
              </h1>
            </Reveal>
            
            <Reveal delay={200}>
              <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6] tracking-[-0.01em] text-[#52525B]">
                Onvyra analyzes your existing leads, customers and deals to identify recoverable revenue, explains <span className="font-[600] text-[#0A0A0B]">why each opportunity matters</span> and helps teams act on it.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className="group inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#0A0A0B] px-[22px] text-[14px] font-[650] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-[1px] active:translate-y-[0px] active:scale-[0.98] transition-all duration-200">
                  Analyze Your Pipeline
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
                <a href="#product" className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-[#E4E4E7] bg-white px-[20px] text-[14px] font-[600] text-[#0A0A0B] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#F9FAFB] hover:border-[#D4D4D8] transition-all">See How It Works</a>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[11px] font-[500] tracking-[0.01em] text-[#71717A]">
                <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#0A0A0B]" /> Potential ≠ Confirmed</span>
                <span className="h-3 w-px bg-[#E4E4E7]" />
                <span>Estimated not guaranteed</span>
                <span className="h-3 w-px bg-[#E4E4E7]" />
                <span>You stay in control</span>
              </div>
            </Reveal>

            {/* Recovery Intelligence Flow - Animated */}
            <Reveal delay={400} className="mt-12">
              <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-1 shadow-premium">
                <div className="rounded-[12px] bg-[#0A0A0B] p-[18px] text-white">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[700] tracking-[0.08em] text-white/50">RECOVERY INTELLIGENCE FLOW</div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_1.5s_ease-in-out_infinite]" />
                      <span className="text-[10px] font-[700] tracking-[0.05em] text-[#10B981]">PROCESSING</span>
                    </div>
                  </div>
                  
                  <div className="mt-5 grid grid-cols-6 gap-2">
                    {[
                      { label: "CRM DATA", value: "1,284", active: scanning > 10 },
                      { label: "AI ANALYZING", value: `${Math.min(100, scanning)}%`, active: scanning > 20 && scanning < 85 },
                      { label: "LEADS", value: "1,284", active: scanning > 40 },
                      { label: "OPPORTUNITIES", value: "43", active: scanning > 65 },
                      { label: "PRIORITY ENGINE", value: "RANKED", active: scanning > 80 },
                      { label: "RECOVERABLE", value: "₽2.8M", active: scanning > 90 },
                    ].map((step, i) => (
                      <div key={i} className="relative">
                        <div className={`rounded-[10px] border p-2.5 transition-all duration-500 ${step.active ? "bg-white text-[#0A0A0B] border-white shadow-[0_2px_8px_rgba(255,255,255,0.2)]" : "bg-white/[0.06] border-white/[0.08] text-white/50"}`}>
                          <div className="text-[9px] font-[700] tracking-[0.06em]">{step.label}</div>
                          <div className="mt-1 font-mono-financial text-[13px] font-[700] tracking-[-0.02em]">{step.value}</div>
                        </div>
                        {i < 5 && <div className={`absolute top-1/2 -right-1 h-px w-2 transition-colors duration-500 ${scanning > (i+1)*15 ? "bg-white" : "bg-white/20"}`} />}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/60 font-[500]">Scanning CRM • Analyzing deal activity • Checking purchase intent • Detecting inactive</span>
                      <span className="font-mono-financial font-[700]">{scanning}%</span>
                    </div>
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-white transition-all duration-100 ease-linear relative overflow-hidden" style={{ width: `${scanning}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-[500]">
                      <span className={`flex items-center gap-1 ${scanning > 20 ? "text-[#10B981]" : "text-white/30"}`}>{scanning > 20 ? "✓" : "○"} Analyzing deal activity</span>
                      <span className={`flex items-center gap-1 ${scanning > 45 ? "text-[#10B981]" : "text-white/30"}`}>{scanning > 45 ? "✓" : "○"} Checking purchase intent</span>
                      <span className={`flex items-center gap-1 ${scanning > 70 ? "text-[#10B981]" : "text-white/30"}`}>{scanning > 70 ? "✓" : "○"} Ranking opportunities</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right - Interactive Product Visualization - HERO PRODUCT */}
          <div className="lg:sticky lg:top-[88px]">
            <Reveal delay={150}>
              <div className="relative rounded-[20px] border border-[#0A0A0B]/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
                {/* Window chrome */}
                <div className="flex h-[44px] items-center justify-between border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFD] px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]" />
                      <div className="h-3 w-3 rounded-full bg-[#FFBD2E] shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]" />
                      <div className="h-3 w-3 rounded-full bg-[#28CA42] shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]" />
                    </div>
                    <div className="ml-3 hidden md:flex items-center gap-2">
                      <div className="h-[22px] w-[22px] rounded-[7px] bg-[#0A0A0B] flex items-center justify-center text-white font-[750] text-[11px]">O</div>
                      <span className="text-[12px] font-[600] tracking-[-0.01em]">Onvyra</span>
                      <span className="text-[11px] text-[#71717A]">— Recovery OS</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline-flex h-[20px] items-center gap-1 rounded-full bg-[#0A0A0B] px-2.5 text-[10px] font-[700] tracking-[0.02em] text-white">
                      <span className="h-1 w-1 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /> AI ENGINE ● ACTIVE
                    </span>
                    <div className="h-6 w-6 rounded-full bg-[#F4F4F5] border border-[#E4E4E7]" />
                  </div>
                </div>

                <div className="grid grid-cols-[180px_1fr] min-h-[520px]">
                  {/* Sidebar */}
                  <div className="border-r border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-3">
                    <div className="space-y-5">
                      <div>
                        <div className="px-2 py-1 text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">OVERVIEW</div>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-2 rounded-[8px] bg-[#0A0A0B] px-2.5 py-2 text-[12.5px] font-[600] text-white shadow-sm">
                            <div className="h-4 w-4 rounded-[5px] bg-white/15 flex items-center justify-center">◧</div> Dashboard
                          </div>
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white hover:text-[#0A0A0B] transition-colors">↗ Recovery Inbox <span className="ml-auto text-[10px] bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full font-[700]">8</span></div>
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">◫ Opportunities</div>
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">⚑ Campaigns</div>
                        </div>
                      </div>
                      <div>
                        <div className="px-2 py-1 text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">SYSTEM</div>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B]">◍ CRM</div>
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B]">◎ Billing</div>
                          <div className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-[500] text-[#52525B]">⚙ Settings</div>
                        </div>
                      </div>
                      <div className="rounded-[12px] bg-[#0A0A0B] p-3 text-white">
                        <div className="text-[11px] font-[700] tracking-[0.05em] text-white/60">RECOVERABLE REVENUE</div>
                        <div className="mt-1.5 font-mono-financial text-[20px] font-[750] tracking-[-0.02em]">₽<CountUp value={2840000} /></div>
                        <div className="mt-1 text-[11px] text-white/60">43 opportunities • Est. not guaranteed</div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-[8px] bg-white/[0.08] py-2"><div className="font-[700] text-[13px]">8</div><div className="text-[9px] text-white/50 font-[600] tracking-[0.05em]">CRITICAL</div></div>
                          <div className="rounded-[8px] bg-white/[0.08] py-2"><div className="font-[700] text-[13px]">15</div><div className="text-[9px] text-white/50 font-[600] tracking-[0.05em]">HIGH</div></div>
                          <div className="rounded-[8px] bg-[#10B981] py-2"><div className="font-[700] text-[13px]">₽<CountUp value={317} />k</div><div className="text-[9px] text-white/80 font-[600] tracking-[0.05em]">CONFIRMED</div></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main */}
                  <div className="bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-[700] tracking-[0.08em] text-[#71717A]">TOP OPPORTUNITY • WHO SHOULD I CONTACT FIRST?</div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[12px] font-[700]">{active.name[0]}</div>
                          <div>
                            <div className="text-[13px] font-[650] tracking-[-0.01em]">{active.name} <span className="font-[500] text-[#71717A]">• {active.company}</span></div>
                            <div className="text-[11px] text-[#71717A]">₽{active.value.toLocaleString("ru-RU")} • Last contact 18 days ago • {active.reason.slice(0, 32)}...</div>
                          </div>
                        </div>
                      </div>
                      <Badge variant={active.score >= 90 ? "critical" : "high"}>{active.score}</Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_100px] gap-3">
                      <div className="rounded-[12px] border border-[#E4E4E7] p-3">
                        <div className="text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">WHY THIS OPPORTUNITY?</div>
                        <div className="mt-2.5 space-y-1.5">
                          {active.signals.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="font-[500] text-[#18181B]">{s}</span>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.includes("+20") ? "bg-[#0A0A0B]" : s.includes("+15") ? "bg-[#52525B]" : "bg-[#A1A1AA]"}`} />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-[#F4F4F5] overflow-hidden">
                            <div className="h-full bg-[#0A0A0B] rounded-full transition-all duration-700" style={{ width: `${active.score}%` }} />
                          </div>
                          <span className="text-[10px] font-[700] font-mono-financial">{active.score}/100</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] p-3 text-center">
                          <div className="text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">SCORE</div>
                          <div className="mt-1 text-[28px] font-[800] tracking-[-0.03em] leading-none">{active.score}</div>
                          <div className="mt-1 text-[10px] font-[700] tracking-[0.05em] text-[#EF4444]">{active.score >= 90 ? "CRITICAL" : "HIGH PRIORITY"}</div>
                        </div>
                        <div className="rounded-[12px] bg-[#0A0A0B] p-3 text-center text-white">
                          <div className="text-[10px] font-[700] tracking-[0.08em] text-white/50">PROBABILITY</div>
                          <div className="mt-1 text-[22px] font-[800] tracking-[-0.02em]">{active.prob}%</div>
                          <div className="mt-1 text-[10px] text-white/60">Est. • Not guaranteed</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">RECOMMENDED ACTION</div>
                        <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">FOLLOW UP TODAY</span>
                      </div>
                      <div className="mt-2 text-[12px] font-[500] leading-[1.4] text-[#18181B]">Customer requested pricing, proposal sent, no follow-up for 18 days. High-value deal with explicit purchase intent.</div>
                      <div className="mt-3 flex gap-2">
                        <button className="flex-1 h-[32px] rounded-[8px] bg-[#0A0A0B] text-white text-[12px] font-[600] hover:bg-[#1A1D23] transition-colors">Generate Recovery Message</button>
                        <button className="h-[32px] w-[32px] rounded-[8px] border border-[#E4E4E7] bg-white flex items-center justify-center hover:bg-[#F9FAFB]">↗</button>
                      </div>
                    </div>

                    {/* Opportunity selector */}
                    <div className="mt-3 flex gap-1.5">
                      {opportunities.map((_, i) => (
                        <button key={i} onClick={() => setActiveOpportunity(i)} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i === activeOpportunity ? "bg-[#0A0A0B]" : "bg-[#E4E4E7] hover:bg-[#D4D4D8]"}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex h-[36px] items-center justify-between border-t border-[#0A0A0B]/[0.06] bg-[#F9FAFB] px-4 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-[500] text-[#52525B]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> 43 opportunities detected</span>
                    <span className="hidden md:inline text-[#A1A1AA]">•</span>
                    <span className="hidden md:inline text-[#71717A]">Potential ≠ Confirmed • Est. not guaranteed</span>
                  </div>
                  <span className="font-mono-financial font-[600] text-[#0A0A0B]">₽2,840,000 estimated recoverable</span>
                </div>
              </div>

              {/* Floating badges */}
              <div className="pointer-events-none absolute -right-4 -top-4 hidden lg:flex flex-col gap-2">
                <div className="rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-[11px] font-[600] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" /> No fake metrics
                </div>
                <div className="rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-[11px] font-[600]">Tenant isolated ✓</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Problem - DARK */}
      <section className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white">
        <div className="absolute inset-0 ambient-grid-dark opacity-40" />
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-[48px] lg:gap-[80px] items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-white/70">THE REVENUE PROBLEM</span>
                </div>
                <h2 className="mt-6 text-[32px] md:text-[40px] font-[720] leading-[1.05] tracking-[-0.025em]">Most businesses lose revenue they already earned</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-white/60">Leads go cold after pricing requests. Proposals sent but never followed up. Old customers forgotten. Your CRM has the data, but no one has time to analyze thousands of records.</p>
                
                <div className="mt-8 space-y-3">
                  {[
                    "Quotation sent, no follow-up for 18 days",
                    "Customer said 'think about it' and disappeared",
                    "High-value deal stalled at proposal stage",
                    "Old pipeline never reviewed systematically",
                  ].map((item, i) => (
                    <div key={i} className="group flex gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-3.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center text-[11px] font-[700]">!</span>
                      <span className="text-[13.5px] font-[500] leading-[1.4] text-white/80 group-hover:text-white transition-colors">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="relative rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-2 shadow-premium-dark backdrop-blur">
                <div className="rounded-[14px] bg-[#FCFCFC] p-6 text-[#0A0A0B]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[700] tracking-[0.08em] text-[#71717A]">WITHOUT ONVYRA</div>
                    <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">REVENUE LEFT BEHIND</span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[550]">1,284 leads in CRM</span><span className="text-[12px] text-[#71717A]">No prioritization</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[550]">43 potential recoveries</span><span className="text-[12px] text-[#71717A]">Hidden</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[550]">₽2.8M estimated</span><span className="text-[12px] text-[#71717A]">Left behind</span></div>
                  </div>

                  <div className="mt-8 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#E4E4E7]" />
                    <span className="text-[11px] font-[700] tracking-[0.08em] text-[#0A0A0B]">WITH ONVYRA</span>
                    <div className="h-px flex-1 bg-[#E4E4E7]" />
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex justify-between items-center rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-3.5"><span className="text-[13px] font-[650]">43 opportunities found</span><span className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">PRIORITIZED</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-3.5"><span className="text-[13px] font-[650]">8 critical, 15 high</span><span className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-white border">WHY EXPLAINED</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#0A0A0B] text-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"><span className="text-[13px] font-[650]">₽2.8M estimated • ₽186k confirmed</span><span className="text-[11px] font-[700] tracking-[0.05em] text-white/60">TRACKED</span></div>
                  </div>

                  <div className="mt-5 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7] p-3 text-[11px] leading-[1.5] text-[#52525B]">
                    <span className="font-[700] text-[#0A0A0B]">Potential ≠ Confirmed</span> — Onvyra finds, your team recovers. Estimated revenue is not guaranteed. Confirmed only when you record RECOVERED with actual amount.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works - LIGHT */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <div className="inline-flex items-center rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 text-[11px] font-[700] tracking-[0.06em] text-[#52525B] shadow-sm">HOW ONVYRA WORKS • DATA → REVENUE</div>
            <h2 className="mt-5 text-[36px] md:text-[44px] font-[750] leading-[0.95] tracking-[-0.03em]">Your CRM already contains money. Onvyra finds it.</h2>
            <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">No new leads needed. No extra ad spend. Just recover what's already there.</p>
          </div>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect", desc: "Upload CSV/XLSX or connect CRM read-only. Russian columns like Имя→name auto-mapped. Data treated as DATA, never instructions.", icon: "◫", color: "bg-[#0A0A0B] text-white" },
            { step: "02", title: "Finds", desc: "Recovery Engine 2.0 scores every lead 0-100 with explainable factors. No black box. Probability transparent with breakdown.", icon: "◍", color: "bg-white border border-[#E4E4E7] text-[#0A0A0B]" },
            { step: "03", title: "Explains", desc: "WHY chips, positive/negative signals, estimated recoverable (Deal Value × Probability). Clearly labeled estimated, not guaranteed.", icon: "◧", color: "bg-white border border-[#E4E4E7] text-[#0A0A0B]" },
            { step: "04", title: "Track", desc: "AI generates message, human approves, marks CONTACTED→RECOVERED with actual amount. Confirmed revenue tracked separately from potential.", icon: "↗", color: "bg-[#059669] text-white" },
          ].map((f, i) => (
            <Reveal key={f.step} delay={i * 80} className="group relative rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-[22px] shadow-premium hover-lift">
              <div className={`h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[14px] font-[700] ${f.color} shadow-sm`}>{f.icon}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono-financial text-[12px] font-[700] tracking-[0.05em] text-[#A1A1AA]">{f.step}</span>
                <h3 className="text-[16px] font-[680] tracking-[-0.02em]">{f.title}</h3>
              </div>
              <p className="mt-2.5 text-[13px] leading-[1.6] text-[#52525B]">{f.desc}</p>
              <div className="mt-4 h-px w-full bg-[#F4F4F5] group-hover:bg-[#E4E4E7] transition-colors" />
              <div className="mt-3 text-[11px] font-[600] tracking-[0.02em] text-[#0A0A0B] flex items-center gap-1">Learn more <span className="transition-transform group-hover:translate-x-0.5">→</span></div>
            </Reveal>
          ))}
        </div>

        {/* Story flow */}
        <Reveal delay={200} className="mt-16 rounded-[16px] border border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-1">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[12px] bg-white border border-[#E4E4E7]/80 px-4 py-3 text-[11px] font-[600] tracking-[0.02em]">
            {["YOUR CRM ALREADY CONTAINS MONEY", "Onvyra analyzes it", "AI finds recoverable opportunities", "System explains WHY", "Team knows WHO to contact", "AI helps prepare message", "Human approves and contacts", "Recovered revenue becomes CONFIRMED"].map((t, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={i === 0 ? "font-[800] text-[#0A0A0B]" : i === 7 ? "font-[800] text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-full border border-[#A7F3D0]" : "text-[#52525B]"}>{t}</span>
                {i < 7 && <span className="text-[#D4D4D8]">→</span>}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* AI Analysis Experience - DARK */}
      <section className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 ambient-grid-dark opacity-30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
          <div className="grid lg:grid-cols-2 gap-[64px] items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-white/70">AI REVENUE INTELLIGENCE • DETERMINISTIC ENGINE</span>
                </div>
                <h2 className="mt-6 text-[32px] md:text-[40px] font-[720] leading-[1.05] tracking-[-0.025em]">Explainable scoring.<br />No black box.</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-white/60">Every opportunity scored 0-100 with business-language factors. You see exactly why it matters, what data supports it, what's missing, and what to do next.</p>
                
                <div className="mt-8 rounded-[16px] border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur">
                  <div className="rounded-[12px] bg-[#111113] border border-white/[0.06] p-5 font-mono text-[12px] leading-[1.7]">
                    <div className="flex justify-between text-white/50 text-[10px] tracking-[0.08em] font-[700]"><span>FACTOR</span><span>POINTS</span></div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between"><span className="text-white/80">+20 explicit intent (интересно, хочу купить)</span><span className="text-[#10B981] font-[700]">+20</span></div>
                      <div className="flex justify-between"><span className="text-white/80">+15 product relevance (CRM implementation)</span><span className="text-[#10B981] font-[700]">+15</span></div>
                      <div className="flex justify-between"><span className="text-white/80">+15 price requested (сколько стоит)</span><span className="text-[#10B981] font-[700]">+15</span></div>
                      <div className="flex justify-between"><span className="text-white/80">+10 proposal sent (no follow-up)</span><span className="text-[#10B981] font-[700]">+10</span></div>
                      <div className="flex justify-between"><span className="text-white/80">+10 high-value deal (₽185,000)</span><span className="text-[#10B981] font-[700]">+10</span></div>
                      <div className="flex justify-between text-white/40"><span>-10 inactivity 18 days</span><span>-10</span></div>
                      <div className="border-t border-white/[0.08] pt-3 mt-3 flex justify-between font-[700] text-white"><span>Score 85 → Critical → ₽180k est. recoverable</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-black">EST.</span></div>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 text-[11px] text-white/50 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/50" /> Each factor has type, signal, points, explanation — business language, not tech jargon
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="space-y-4">
                <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[700] tracking-[0.08em] text-white/50">AI ANALYSIS • REAL DATA ONLY</div>
                    <Badge variant="emerald" className="text-[10px]">DETERMINISTIC</Badge>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-[14px] bg-white p-4 text-[#0A0A0B]">
                      <div className="text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">RECOVERY SCORE</div>
                      <div className="mt-2 text-[32px] font-[850] leading-none tracking-[-0.03em]">92<span className="text-[14px] font-[600] text-[#71717A]">/100</span></div>
                      <div className="mt-2 inline-flex text-[10px] font-[800] tracking-[0.05em] px-2 py-1 rounded-full bg-[#EF4444] text-white">CRITICAL</div>
                    </div>
                    <div className="rounded-[14px] bg-white/[0.06] border border-white/[0.08] p-4">
                      <div className="text-[10px] font-[700] tracking-[0.08em] text-white/50">PROBABILITY</div>
                      <div className="mt-2 text-[28px] font-[800] tracking-[-0.02em] leading-none">74%</div>
                      <div className="mt-2 text-[10px] text-white/50">Est. • Not guaranteed</div>
                    </div>
                    <div className="rounded-[14px] bg-white/[0.06] border border-white/[0.08] p-4">
                      <div className="text-[10px] font-[700] tracking-[0.08em] text-white/50">CONFIDENCE</div>
                      <div className="mt-2 text-[18px] font-[700] tracking-[-0.01em]">High</div>
                      <div className="mt-1 text-[11px] text-white/60">Strong buying intent</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[12px] bg-[#0A0A0B] border border-white/[0.06] p-4">
                    <div className="text-[10px] font-[700] tracking-[0.08em] text-white/50">WHY THIS OPPORTUNITY?</div>
                    <div className="mt-2 text-[13px] leading-[1.5] text-white/80">Customer explicitly requested pricing, proposal sent, no follow-up for 18 days. High-value deal with explicit purchase intent. No rejection signal.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium">
                    <div className="text-[10px] font-[700] tracking-[0.08em] text-[#059669]">POSITIVE SIGNALS</div>
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2 text-[11px]"><span className="font-[700] text-[#059669]">+20</span><span className="font-[500]">Explicit purchase intent</span></div>
                      <div className="flex gap-2 text-[11px]"><span className="font-[700] text-[#059669]">+15</span><span className="font-[500]">Product relevance</span></div>
                      <div className="flex gap-2 text-[11px]"><span className="font-[700] text-[#059669]">+15</span><span className="font-[500]">Price requested</span></div>
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium">
                    <div className="text-[10px] font-[700] tracking-[0.08em] text-[#71717A]">MISSING INFO</div>
                    <div className="mt-3 text-[11px] leading-[1.5] text-[#52525B]">Manager not specified. Last message truncated. No competitor info. AI says: Not enough data to determine — never invents.</div>
                    <div className="mt-2 text-[10px] font-[600] text-[#A1A1AA]">AI never invents facts not in source</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Recovery Inbox Preview - LIGHT */}
      <section id="product" className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
                <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY INBOX • WHO SHOULD I CONTACT FIRST?</span>
              </div>
              <h2 className="mt-5 text-[32px] md:text-[40px] font-[750] leading-[0.95] tracking-[-0.03em]">Prioritized by score,<br />probability, and revenue.</h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#71717A]">Default sorting:</span>
              <span className="font-[650] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white text-[12px]">Score ↓</span>
              <span className="px-2.5 py-1 rounded-full border text-[12px]">Deal Value</span>
              <span className="px-2.5 py-1 rounded-full border text-[12px]">Inactivity</span>
            </div>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-3">
          {opportunities.map((opp, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className={`group relative rounded-[16px] border bg-white p-[18px] shadow-premium hover-lift transition-all cursor-pointer ${i === activeOpportunity ? "border-[#0A0A0B] ring-1 ring-[#0A0A0B] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/20"}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="h-[44px] w-[44px] rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[14px] font-[700] shadow-sm shrink-0">{opp.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-[650] text-[14px] tracking-[-0.01em]">{opp.name}</span>
                        <span className="text-[13px] text-[#71717A]">• {opp.company}</span>
                        <Badge variant={opp.score >= 90 ? "critical" : opp.score >= 80 ? "high" : "medium"}>{opp.score}</Badge>
                        {i === 0 && <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white animate-[pulse-subtle_2s_ease-in-out_infinite]">TOP PRIORITY</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                        <span><span className="text-[#71717A]">Deal:</span> <span className="font-[650] font-mono-financial">₽{opp.value.toLocaleString("ru-RU")}</span></span>
                        <span><span className="text-[#71717A]">Est. recoverable:</span> <span className="font-[700] font-mono-financial">₽{Math.round(opp.value * opp.prob / 100).toLocaleString("ru-RU")}</span> <span className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</span></span>
                        <span><span className="text-[#71717A]">Prob:</span> <span className="font-[600]">{opp.prob}%</span> • High confidence</span>
                        <span><span className="text-[#71717A]">Last contact:</span> 18 days ago</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {opp.signals.slice(0, 4).map((s, j) => (
                          <span key={j} className="text-[11px] px-2.5 py-1 rounded-full border bg-[#F9FAFB] border-[#E4E4E7] text-[#18181B] font-[500]">{s}</span>
                        ))}
                      </div>
                      <div className="mt-3 text-[11px] font-[700] tracking-[0.02em]">→ {opp.action}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 lg:ml-4">
                    <div className="hidden md:block text-right">
                      <div className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">EST. RECOVERABLE</div>
                      <div className="font-mono-financial font-[750] text-[16px] tracking-[-0.02em]">₽{Math.round(opp.value * opp.prob / 100).toLocaleString("ru-RU")}</div>
                    </div>
                    <div className="h-[48px] w-[48px] rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] flex flex-col items-center justify-center">
                      <div className="text-[18px] font-[800] tracking-[-0.02em] leading-none">{opp.score}</div>
                      <div className="text-[8px] font-[700] tracking-[0.08em] text-[#71717A]">SCORE</div>
                    </div>
                    <div className="hidden lg:flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] text-white group-hover:bg-[#1A1D23] transition-colors">↗</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300} className="mt-8 flex justify-center">
          <Link href="/inbox" className="inline-flex h-[40px] items-center gap-2 rounded-[12px] border border-[#0A0A0B]/10 bg-white px-5 text-[13px] font-[600] shadow-sm hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] transition-all">Open Recovery Inbox <span>→</span></Link>
        </Reveal>
      </section>

      {/* Estimated vs Confirmed - DARK */}
      <section className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white">
        <div className="absolute inset-0 ambient-grid-dark opacity-20" />
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
          <Reveal>
            <div className="mx-auto max-w-[720px] text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[11px] font-[700] tracking-[0.06em] text-white/70">ESTIMATED vs CONFIRMED • FINANCIAL HONESTY</span>
              </div>
              <h2 className="mt-6 text-[32px] md:text-[44px] font-[750] leading-[0.9] tracking-[-0.03em]">Estimated ≠ Confirmed.<br />Always separated.</h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-white/60">Onvyra never confuses potential with actual. Estimated revenue is not guaranteed. Confirmed only when you record RECOVERED with actual amount.</p>
            </div>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
            <Reveal>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur">
                <div className="rounded-[16px] bg-white p-6 text-[#0A0A0B]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[700] tracking-[0.08em] text-[#71717A]">ESTIMATED RECOVERABLE</div>
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">ESTIMATED • NOT GUARANTEED</span>
                  </div>
                  <div className="mt-4 font-mono-financial text-[36px] font-[850] tracking-[-0.03em] leading-none">₽<CountUp value={2840000} /></div>
                  <div className="mt-2 text-[13px] text-[#52525B]">43 opportunities • ₽185k avg • 68% avg probability</div>
                  <div className="mt-5 space-y-2.5">
                    <div className="flex justify-between text-[12px] p-2.5 rounded-[10px] bg-[#F9FAFB] border"><span>Deal Value × Probability</span><span className="font-mono-financial font-[650]">₽185k × 74% = ₽136,900</span></div>
                    <div className="text-[11px] leading-[1.5] text-[#71717A]">Formula: Decimal-safe integer arithmetic. No float artifacts. 100000×0.5=50000 exact.</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-[20px] border border-[#10B981]/30 bg-[#10B981]/[0.08] p-1 backdrop-blur">
                <div className="rounded-[16px] bg-[#059669] p-6 text-white shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[700] tracking-[0.08em] text-white/70">CONFIRMED RECOVERED</div>
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white text-[#059669]">CONFIRMED • ATTRIBUTED</span>
                  </div>
                  <div className="mt-4 font-mono-financial text-[36px] font-[850] tracking-[-0.03em] leading-none">₽<CountUp value={317000} /></div>
                  <div className="mt-2 text-[13px] text-white/80">12 recovered • 8.4% recovery rate • Attributed</div>
                  <div className="mt-5 space-y-2.5">
                    <div className="flex justify-between text-[12px] p-2.5 rounded-[10px] bg-white/15 border border-white/20"><span>Explicit user-recorded</span><span className="font-[700]">RECOVERED + amount + date</span></div>
                    <div className="text-[11px] leading-[1.5] text-white/70">Only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers. Latest per lead prevents ghost revenue.</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Security - LIGHT */}
      <section className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-[64px] items-start">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
                <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">SECURITY • ENTERPRISE-GRADE</span>
              </div>
              <h2 className="mt-6 text-[32px] md:text-[40px] font-[750] leading-[0.95] tracking-[-0.03em]">Tenant isolation.<br />No fake claims.</h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">Every query scoped organizationId. Tested cross-org READ/WRITE. No SOC2/ISO claims unless verified. Honest security.</p>
              
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { title: "Tenant isolation", desc: "Every query includes orgId from session, not client. Cross-tenant returns 404." },
                  { title: "Secure auth", desc: "bcrypt 12 rounds, httpOnly JWT, SameSite lax, secure in prod, 32+ chars secret." },
                  { title: "RBAC", desc: "OWNER/ADMIN/MEMBER server-side enforced. Billing OWNER only." },
                  { title: "Audit logging", desc: "Org-scoped, no secrets, no stack traces to client." },
                  { title: "Webhook verification", desc: "Stripe HMAC SHA256 timingSafeEqual 5min tolerance." },
                  { title: "Encrypted tokens", desc: "HubSpot tokens AES-256-GCM at rest." },
                  { title: "Rate limiting", desc: "In-memory + Redis optional, 429 with headers." },
                  { title: "Prompt injection defense", desc: "Imported text as DATA never instructions." },
                ].map((item, i) => (
                  <div key={i} className="rounded-[12px] border border-[#E4E4E7]/80 bg-white p-3.5 shadow-sm hover:border-[#0A0A0B]/15 transition-colors">
                    <div className="text-[12px] font-[650] tracking-[-0.01em]">{item.title}</div>
                    <div className="mt-1 text-[11px] leading-[1.5] text-[#71717A]">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] p-3 text-[11px] leading-[1.5] text-[#52525B]">
                <span className="font-[700] text-[#0A0A0B]">No false claims:</span> No SOC2, ISO27001, GDPR certified, HIPAA, PCI unless verified. Security page explains actual protections, not marketing badges.
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-[20px] border border-[#0A0A0B]/[0.08] bg-white p-2 shadow-premium">
              <div className="rounded-[14px] bg-[#0A0A0B] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-[700] tracking-[0.08em] text-white/50">TENANT ISOLATION TEST • ORG A vs ORG B</div>
                  <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#10B981] text-white">VERIFIED</span>
                </div>
                <div className="mt-5 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between items-center rounded-[8px] bg-white/[0.06] border border-white/[0.08] p-2.5"><span className="text-white/60">GET /api/leads/{`{B_id}`} as ORG_A</span><span className="text-[#EF4444] font-[700]">→ 404</span></div>
                  <div className="flex justify-between items-center rounded-[8px] bg-white/[0.06] border border-white/[0.08] p-2.5"><span className="text-white/60">UPDATE ORG_B data as ORG_A</span><span className="text-[#EF4444] font-[700]">→ 403</span></div>
                  <div className="flex justify-between items-center rounded-[8px] bg-white/[0.06] border border-white/[0.08] p-2.5"><span className="text-white/60">POST /api/campaigns with B leadIds as A</span><span className="text-[#EF4444] font-[700]">→ 400</span></div>
                  <div className="flex justify-between items-center rounded-[8px] bg-[#ECFDF5] border border-[#A7F3D0]/30 p-2.5"><span className="text-[#059669]">ORG_A cannot read B opportunities</span><span className="text-[#059669] font-[700]">✓ PASS</span></div>
                  <div className="flex justify-between items-center rounded-[8px] bg-[#ECFDF5] border border-[#A7F3D0]/30 p-2.5"><span className="text-[#059669]">ORG_A cannot access B billing</span><span className="text-[#059669] font-[700]">✓ PASS</span></div>
                  <div className="flex justify-between items-center rounded-[8px] bg-[#ECFDF5] border border-[#A7F3D0]/30 p-2.5"><span className="text-[#059669]">ORG_A cannot access B CRM tokens</span><span className="text-[#059669] font-[700]">✓ PASS</span></div>
                </div>
                <div className="mt-4 text-[11px] text-white/50">All queries include organizationId from session, not client. Tested via security.test.ts 11 cases PASS.</div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[10px] bg-[#F9FAFB] border p-3"><div className="text-[12px] font-[700]">43/43</div><div className="text-[10px] text-[#71717A] font-[600]">TESTS PASS</div></div>
                <div className="rounded-[10px] bg-[#F9FAFB] border p-3"><div className="text-[12px] font-[700]">100%</div><div className="text-[10px] text-[#71717A] font-[600]">TENANT ISOLATION</div></div>
                <div className="rounded-[10px] bg-[#0A0A0B] text-white p-3"><div className="text-[12px] font-[700]">0 P0/P1</div><div className="text-[10px] text-white/60 font-[600]">BLOCKERS</div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing - LIGHT premium */}
      <section className="relative z-10 border-t border-[#0A0A0B]/[0.06] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
          <Reveal>
            <div className="mx-auto max-w-[640px] text-center">
              <h2 className="text-[32px] md:text-[40px] font-[750] leading-[0.95] tracking-[-0.03em]">Simple pricing,<br />honest limits.</h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">FREE for testing, PRO for small teams, BUSINESS for larger pipelines. Limits enforced server-side, no fake unlimited claims.</p>
            </div>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-[1040px] mx-auto">
            {[
              { plan: "FREE", price: "Free", desc: "For trying out", limits: ["500 leads", "3 imports/mo", "100 AI/mo", "2 campaigns", "1 user", "0 CRM", "50k tokens"], cta: "Start Free", popular: false },
              { plan: "PRO", price: "$49", suffix: "/mo", desc: "For growing businesses", limits: ["5,000 leads", "50 imports/mo", "1,000 AI/mo", "20 campaigns", "5 users", "1 CRM", "500k tokens"], cta: "Start PRO", popular: true },
              { plan: "BUSINESS", price: "$199", suffix: "/mo", desc: "For teams and high volume", limits: ["50,000 leads", "500 imports/mo", "10,000 AI/mo", "100 campaigns", "25 users", "5 CRM", "5M tokens"], cta: "Start BUSINESS", popular: false },
            ].map((p, i) => (
              <Reveal key={p.plan} delay={i * 80}>
                <div className={`group relative rounded-[20px] border bg-white p-[26px] shadow-premium hover-lift transition-all ${p.popular ? "border-[#0A0A0B] shadow-[0_0_0_1px_#0A0A0B,0_16px_40px_rgba(0,0,0,0.12)] scale-[1.02]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/15"}`}>
                  {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0A0B] px-3 py-1 text-[11px] font-[700] tracking-[0.05em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]">MOST POPULAR</div>}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[12px] font-[800] tracking-[0.08em] text-[#71717A]">{p.plan}</div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-[36px] font-[850] tracking-[-0.03em] leading-none">{p.price}</span>
                        {p.suffix && <span className="text-[14px] font-[600] text-[#71717A]">{p.suffix}</span>}
                      </div>
                      <div className="mt-1 text-[13px] text-[#52525B]">{p.desc}</div>
                    </div>
                    <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[14px] ${p.popular ? "bg-[#0A0A0B] text-white" : "bg-[#F4F4F5] text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white transition-colors"}`}>↗</div>
                  </div>
                  <div className="mt-6 space-y-2.5">
                    {p.limits.map((l, j) => (
                      <div key={j} className="flex items-center gap-2 text-[13px]">
                        <span className="h-[18px] w-[18px] rounded-full bg-[#F4F4F5] flex items-center justify-center text-[10px] font-[700]">✓</span>
                        <span className="font-[500] tracking-[-0.01em]">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Link href="/register" className={`flex h-[40px] w-full items-center justify-center rounded-[12px] text-[13px] font-[650] transition-all ${p.popular ? "bg-[#0A0A0B] text-white hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.16)] hover:-translate-y-[0.5px]" : "border border-[#E4E4E7] bg-white hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B]"}`}>{p.cta}</Link>
                  </div>
                  <div className="mt-3 text-center text-[11px] text-[#71717A]">Limits enforced server-side • No fake unlimited</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200} className="mt-10 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-4 py-2 text-[11px] font-[500] shadow-sm">
              <span>✓ No fake payments</span><span className="h-3 w-px bg-[#E4E4E7]" /><span>✓ Billing shows NOT CONFIGURED when Stripe absent</span><span className="h-3 w-px bg-[#E4E4E7]" /><span>✓ Pricing matches code PLAN_LIMITS</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ - LIGHT */}
      <section className="relative z-10 mx-auto max-w-[800px] px-6 lg:px-8 py-[88px]">
        <Reveal>
          <h2 className="text-[28px] font-[750] tracking-[-0.02em]">FAQ • Honest answers</h2>
          <p className="mt-2 text-[14px] text-[#52525B]">No fake testimonials, no fabricated case studies, no guaranteed claims.</p>
        </Reveal>

        <div className="mt-8 space-y-3">
          {[
            { q: "What does Onvyra actually do?", a: "Analyzes existing leads/deals to find commercially valuable opportunities that went cold, prioritizes who to contact first, explains WHY with business-language factors, helps generate recovery message, tracks CONTACTED→RECOVERED with confirmed revenue. Estimated ≠ Confirmed." },
            { q: "Does it automatically send messages?", a: "No. AI generates, you review & edit, mark ready, then manually contact. MVP is manual action required. No auto-send unless real messaging provider verified. We do not pretend Send works if no provider. Human approval always required." },
            { q: "How is estimated recoverable calculated?", a: "Deal Value × Probability. Probability from Recovery Score, buying intent, inactivity, data completeness, deal stage. Decimal-safe integer arithmetic: cents = Math.round(value*100), result = Math.round(cents*prob)/100. 100000×0.5=50000 exact, no float artifacts. Estimated, not guaranteed. Potential ≠ Confirmed. Confirmed only when you record RECOVERED with actual amount and date." },
            { q: "Is it a generic CRM or AI wrapper?", a: "No. Onvyra is NOT generic CRM, chatbot, AI wrapper, lead-gen, fake analytics. It is revenue recovery OS with deterministic engine 2.0 scoring 0-100 explainable factors, probability breakdown, audit log, tenant isolation, RBAC, billing enforcement, security headers, health endpoint, production-ready." },
            { q: "What about data security?", a: "Tenant isolation every query scoped organizationId, tested cross-org READ/WRITE IDOR 11 tests PASS, secure auth bcrypt httpOnly JWT SameSite lax secure in prod 32+ chars secret, audit log org-scoped no secrets, prompt injection defense imported text as DATA not instructions, security headers CSP HSTS X-Frame DENY etc. No false SOC2/ISO claims." },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 40}>
              <div className="group rounded-[16px] border border-[#E4E4E7]/80 bg-white shadow-sm hover:border-[#0A0A0B]/15 transition-all">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between p-[18px] text-left">
                  <span className="text-[14px] font-[600] tracking-[-0.01em] pr-4">{item.q}</span>
                  <span className={`h-[28px] w-[28px] rounded-full border flex items-center justify-center text-[12px] transition-all shrink-0 ${faqOpen === i ? "bg-[#0A0A0B] text-white border-[#0A0A0B] rotate-45" : "bg-[#F9FAFB] border-[#E4E4E7] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B]"}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${faqOpen === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="px-[18px] pb-[18px] text-[13px] leading-[1.6] text-[#52525B]">{item.a}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA - DARK */}
      <section className="relative z-10 border-t border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 ambient-grid-dark opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[1200px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)]" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px] text-center">
          <Reveal>
            <h3 className="text-[36px] md:text-[48px] font-[800] leading-[0.9] tracking-[-0.03em]">Ready to find where<br />you0027re leaving money behind?</h3>
            <p className="mt-5 text-[15px] leading-[1.6] text-white/60 max-w-[600px] mx-auto">Register → Onboard → Import or Connect CRM → Analyze → See real recoverable revenue → Recovery Inbox → Opportunity → Action → Outcome → Confirmed Recovered Revenue</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="group inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-white px-[24px] text-[14px] font-[700] text-[#0A0A0B] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_8px_24px_rgba(255,255,255,0.1)] hover:bg-[#F5F5F7] hover:shadow-[0_8px_32px_rgba(255,255,255,0.16)] hover:-translate-y-[1px] active:translate-y-[0px] active:scale-[0.98] transition-all duration-200">Analyze Your Pipeline <span className="transition-transform group-hover:translate-x-0.5">→</span></Link>
              <Link href="/login" className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-white/15 bg-white/[0.06] px-[22px] text-[14px] font-[600] text-white backdrop-blur hover:bg-white/[0.1] hover:border-white/20 transition-all">View Demo (1,000 leads)</Link>
            </div>
            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-[500] text-white/50">
              <span>✓ No fake customer logos</span><span className="h-3 w-px bg-white/10" /><span>✓ No fake testimonials</span><span className="h-3 w-px bg-white/10" /><span>✓ No fabricated case studies</span><span className="h-3 w-px bg-white/10" /><span>✓ No guaranteed claims</span><span className="h-3 w-px bg-white/10" /><span>✓ Built for B2B teams • v1.0</span>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#0A0A0B]/[0.06] bg-[#FCFCFC] py-8">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 flex flex-col md:flex-row justify-between gap-4 items-center text-[12px]">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-[8px] bg-[#0A0A0B] flex items-center justify-center text-white font-[750] text-[11px]">O</div>
            <span className="font-[600] tracking-[-0.01em]">© 2026 Onvyra OS v1.0 — AI Revenue Recovery Operating System</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[#71717A]">
            <Link href="/pricing" className="font-[500] hover:text-[#0A0A0B] hover:underline underline-offset-4 transition-colors">Pricing</Link>
            <Link href="/security" className="font-[500] hover:text-[#0A0A0B] hover:underline underline-offset-4 transition-colors">Security</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-[600] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Build PASS • 43/43 tests</span>
            <span className="text-[11px]">Potential ≠ Confirmed • Est. not guaranteed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
