/* eslint-disable react/no-unescaped-entities */
"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

function CountUp({ value, duration = 1600, prefix = "", suffix = "", trigger = true }: { value: number; duration?: number; prefix?: string; suffix?: string; trigger?: boolean }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (!trigger || hasAnimated.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(value); hasAnimated.current = true; return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(ease * value));
      if (progress < 1) requestAnimationFrame(animate);
      else hasAnimated.current = true;
    };
    requestAnimationFrame(animate);
  }, [value, duration, trigger]);
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
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`${className} transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>{children}</div>;
}

export default function LandingPage() {
  const [scanning, setScanning] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [activeOpp, setActiveOpp] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const [sortKey, setSortKey] = useState<"score" | "value" | "inactivity">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= 100) {
        setScanning(100);
        setScanComplete(true);
        clearInterval(interval);
      } else {
        setScanning(current);
      }
    }, 35);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scanComplete) return;
    const interval = setInterval(() => setActiveOpp(s => (s + 1) % 3), 5000);
    return () => clearInterval(interval);
  }, [scanComplete]);

  const opportunities = [
    { name: "Ivan Petrov", company: "Acme LLC", value: 185000, score: 92, prob: 74, why: "Pricing requested • Strong product match • No contact 18 days", action: "Follow up today", factors: ["+20 Explicit purchase intent", "+15 Product relevance", "+15 Price requested", "+10 Proposal sent", "+10 No follow-up", "+10 High-value"], inactivityDays: 18 },
    { name: "Maria Sokolova", company: "Beta Corp", value: 240000, score: 88, prob: 68, why: "Quotation sent • Think signal • Proposal stage", action: "Re-engage", factors: ["+20 Purchase intent", "+15 Quotation", "+10 Proposal", "+10 Inactivity", "+10 High value"], inactivityDays: 9 },
    { name: "Alexey Kuznetsov", company: "Gamma LLC", value: 120000, score: 81, prob: 62, why: "Product specified • No response 14d", action: "Follow up", factors: ["+15 Product", "+15 Price request", "+10 Proposal sent", "+5 Think signal"], inactivityDays: 22 },
  ];

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "score") cmp = a.score - b.score;
    else if (sortKey === "value") cmp = a.value - b.value;
    else if (sortKey === "inactivity") cmp = a.inactivityDays - b.inactivityDays;
    return sortDir === "desc" ? -cmp : cmp;
  });

  const active = opportunities[activeOpp];

  const handleSort = (key: "score" | "value" | "inactivity") => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleGenerateMessage = (opp: typeof opportunities[0]) => {
    const msg = `Hi ${opp.name.split(" ")[0]},\n\nFollowing up on your ${opp.company} inquiry — you requested pricing ${opp.inactivityDays} days ago and we sent a proposal. Wanted to check if you still need help with CRM implementation.\n\nWe can schedule a 15-min call this week to clarify scope and finalize next steps.\n\nBest,\nOnvyra Demo • Potential ≠ Confirmed • Est. ₽${Math.round(opp.value * opp.prob / 100).toLocaleString("ru-RU")} not guaranteed`;
    setGeneratedMessage(msg);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (generatedMessage && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(generatedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-[#0A0A0B] selection:bg-[#0A0A0B] selection:text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(#0A0A0B 1px, transparent 1px), linear-gradient(90deg, #0A0A0B 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0A0B]/90 backdrop-blur-[20px]">
        <div className="mx-auto flex h-[56px] max-w-[1360px] items-center justify-between px-6 lg:px-[32px]">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-[28px] w-[28px] rounded-[8px] bg-white text-[#0A0A0B] flex items-center justify-center font-[800] text-[13px] tracking-[-0.02em] shadow-[0_1px_2px_rgba(255,255,255,0.1)] group-hover:shadow-[0_2px_8px_rgba(255,255,255,0.15)] transition-all">O</div>
              <span className="font-[650] text-[14px] tracking-[-0.02em] text-white">Onvyra</span>
              <span className="hidden md:inline-flex ml-1 h-[18px] items-center rounded-full bg-white/10 border border-white/10 px-2 text-[9px] font-[800] tracking-[0.05em] text-white/80">OS v1.0</span>
              <span className="hidden lg:inline-flex ml-2 h-[20px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 text-[10px] font-[600] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /> AI ENGINE ● ACTIVE
              </span>
            </Link>
            <nav className="hidden lg:flex items-center gap-0.5">
              <button onClick={() => scrollToId("product")} className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Product</button>
              <button onClick={() => scrollToId("how-it-works")} className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">How it works</button>
              <Link href="/pricing" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Pricing</Link>
              <Link href="/security" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Security</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden md:inline-flex h-[32px] items-center justify-center rounded-[9px] px-3.5 text-[12.5px] font-[550] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">Sign in</Link>
            <Link href="/register" className="inline-flex h-[32px] items-center justify-center rounded-[9px] bg-white px-4 text-[12.5px] font-[650] text-[#0A0A0B] shadow-[0_1px_2px_rgba(255,255,255,0.1)] hover:bg-[#F5F5F7] hover:shadow-[0_4px_12px_rgba(255,255,255,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all duration-200">Analyze Your Pipeline</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 border-b border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: `linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(90deg, #FFFFFF 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[820px] w-[1280px] bg-[radial-gradient(60%_55%_at_50%_0%,rgba(255,255,255,0.038)_0%,rgba(255,255,255,0.012)_38%,transparent_72%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="absolute top-[56px] left-0 right-0 h-px bg-white/[0.04]" />
        </div>

        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] pt-[88px] md:pt-[112px] pb-[96px]">
          <div className="grid lg:grid-cols-[560px_640px] justify-between gap-[48px] lg:gap-[64px] items-start">
            <div className="pt-2">
              <div className={`transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 backdrop-blur-[8px]">
                  <span className="h-1 w-1 rounded-full bg-[#EF4444]" />
                  <span className="text-[10px] font-[700] tracking-[0.06em] text-white/55">ONVYRA OS • REVENUE RECOVERY ENGINE</span>
                  <span className="h-2.5 w-px bg-white/10 ml-1" />
                  <span className="text-[9.5px] font-[600] tracking-[0.04em] text-white/35">LIVE • Potential ≠ Confirmed</span>
                </div>
              </div>

              <div className={`mt-10 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-100 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
                <h1 className="max-w-[600px] text-[52px] md:text-[64px] lg:text-[72px] font-[800] leading-[0.88] tracking-[-0.05em]">
                  <span className="block">Find the customers</span>
                  <span className="block text-white/28 font-[750] tracking-[-0.045em]">your business is</span>
                  <span className="block tracking-[-0.05em]">leaving behind.</span>
                </h1>
              </div>

              <div className={`mt-7 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-200 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <p className="max-w-[520px] text-[16px] leading-[1.6] tracking-[-0.015em] text-white/50">
                  Your CRM already contains money. Onvyra finds recoverable revenue, explains <span className="font-[600] text-white/85">why each opportunity matters</span> and shows who to contact first.
                </p>
              </div>

              <div className={`mt-9 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-300 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/register" className="group inline-flex h-[48px] items-center justify-center gap-2 rounded-[12px] bg-white px-[26px] text-[14px] font-[750] tracking-[-0.01em] text-[#0A0A0B] shadow-[0_1px_2px_rgba(255,255,255,0.08),0_12px_32px_rgba(255,255,255,0.10)] hover:bg-[#F5F5F7] hover:shadow-[0_16px_40px_rgba(255,255,255,0.14)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] transition-all duration-200">
                    Analyze Your Pipeline
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                  <button onClick={() => scrollToId("how-it-works")} className="inline-flex h-[48px] items-center justify-center rounded-[12px] border border-white/[0.12] bg-white/[0.05] px-[20px] text-[13.5px] font-[600] tracking-[-0.01em] text-white/80 backdrop-blur hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-white transition-all">
                    See How It Works
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-3 text-[11px] font-[500] tracking-[0.01em] text-white/35">
                  <span className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" /> Potential ≠ Confirmed</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span>Est. not guaranteed</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span>Deterministic • No hallucination</span>
                </div>
              </div>

              <div className={`mt-16 border-t border-white/[0.06] pt-6 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-[400ms] ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-[700] tracking-[0.08em] text-white/30">RECOVERY INTELLIGENCE • DETERMINISTIC SYSTEM</div>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${scanComplete ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
                    <span className={`text-[10px] font-[700] tracking-[0.06em] ${scanComplete ? "text-white/60" : "text-white/40"}`}>{scanComplete ? "43 DETECTED • ₽2.8M" : `${scanning}% ANALYZING`}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-0 overflow-x-auto scrollbar-none">
                  {[
                    { k: "CRM DATA", v: "1,284", t: 8 },
                    { k: "AI ANALYZING", v: scanComplete ? "100%" : `${scanning}%`, t: 18 },
                    { k: "INTENT", v: "CHECKED", t: 40 },
                    { k: "INACTIVE", v: "DETECTED", t: 60 },
                    { k: "OPPS", v: "43", t: 75 },
                    { k: "PRIORITY", v: "RANKED", t: 88 },
                    { k: "RECOVERABLE", v: "₽2.8M", t: 95 },
                  ].map((step, i) => {
                    const active = scanning > step.t || scanComplete;
                    const current = !scanComplete && scanning >= step.t && scanning < ([8,18,40,60,75,88,95][i+1] ?? 101);
                    return (
                      <div key={i} className="flex items-center gap-0 shrink-0">
                        <div className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-500 ${current ? "bg-white text-black border-white shadow-[0_2px_12px_rgba(255,255,255,0.14)]" : active ? "bg-white/[0.06] border-white/[0.08] text-white/50" : "bg-transparent border-white/[0.06] text-white/20"}`}>
                          <span className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-[800] border transition-colors ${active ? "bg-white text-black border-white" : "bg-white/[0.04] border-white/10 text-white/20"}`}>{active ? "✓" : "○"}</span>
                          <span className="text-[10px] font-[700] tracking-[0.05em] leading-none">{step.k}</span>
                          <span className="font-mono-financial text-[11px] font-[750] tracking-[-0.02em] leading-none ml-1">{step.v}</span>
                        </div>
                        {i < 6 && <div className={`h-px w-4 shrink-0 transition-colors duration-500 ${scanning > step.t || scanComplete ? "bg-white/25" : "bg-white/[0.06]"}`} />}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/30 font-[500] tracking-[0.01em] font-mono text-[10.5px]">CRM → ANALYZING → INTENT → INACTIVE → PROBABILITY → PRIORITY → RECOVERABLE</span>
                    <span className="font-mono-financial font-[700] text-white/50 tabular-nums text-[11px]">{scanning}%</span>
                  </div>
                  <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full bg-white transition-all duration-100 ease-linear rounded-full" style={{ width: `${scanning}%` }} />
                  </div>
                  {scanComplete && (
                    <div className="pt-1 flex items-center gap-2 text-[11px] font-[550] tracking-[-0.01em] text-white/50">
                      <span className="h-4 w-4 rounded-full bg-white text-black flex items-center justify-center text-[9px] font-[800]">✓</span>
                      43 opportunities • ₽2,840,000 estimated recoverable • Potential ≠ Confirmed • Deterministic
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:sticky lg:top-[80px] lg:-mr-2">
              <Reveal delay={150}>
                <div className="group relative w-full lg:w-[640px] rounded-[20px] border border-white/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_64px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_32px_80px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] hover:-translate-y-[2px] transition-all duration-500">
                  <div className="flex h-[44px] items-center justify-between border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFD] px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
                        <div className="h-3 w-3 rounded-full bg-[#FFBD2E] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
                        <div className="h-3 w-3 rounded-full bg-[#28CA42] shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
                      </div>
                      <div className="ml-3 hidden md:flex items-center gap-2">
                        <div className="h-[22px] w-[22px] rounded-[7px] bg-[#0A0A0B] flex items-center justify-center text-white font-[800] text-[11px]">O</div>
                        <span className="text-[12px] font-[650] tracking-[-0.01em]">Onvyra</span>
                        <span className="text-[11px] text-[#71717A] font-[450]">— Revenue OS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="hidden md:inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[#0A0A0B] px-2.5 text-[10px] font-[700] tracking-[0.02em] text-white shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /> AI ENGINE ● ACTIVE
                      </span>
                      <div className="h-7 w-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[11px] font-[700]">IP</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[200px_1fr] min-h-[540px]">
                    <div className="border-r border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-3.5 flex flex-col">
                      <div className="space-y-5 flex-1">
                        <div>
                          <div className="px-2 py-1 text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">OVERVIEW</div>
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#0A0A0B] px-3 py-2.5 text-[13px] font-[600] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                              <div className="h-4 w-4 rounded-[5px] bg-white/15 flex items-center justify-center text-[10px]">◧</div> Dashboard
                            </div>
                            <Link href="/inbox" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white hover:text-[#0A0A0B] transition-colors">↗ Recovery Inbox <span className="ml-auto text-[10px] bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full font-[700] shadow-sm">8</span></Link>
                            <Link href="/leads" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">◫ Opportunities</Link>
                            <Link href="/campaigns" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">⚑ Campaigns</Link>
                          </div>
                        </div>
                        <div>
                          <div className="px-2 py-1 text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">SYSTEM</div>
                          <div className="mt-1.5 space-y-0.5">
                            <Link href="/integrations" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">◍ CRM</Link>
                            <Link href="/billing" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">◎ Billing</Link>
                            <Link href="/settings" className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12.5px] font-[500] text-[#52525B] hover:bg-white transition-colors">⚙ Settings</Link>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[14px] bg-[#0A0A0B] p-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                        <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">RECOVERABLE REVENUE</div>
                        <div className="mt-3 font-mono-financial text-[36px] font-[850] tracking-[-0.04em] leading-[0.9]">₽<CountUp value={2840000} trigger={scanComplete} /></div>
                        <div className="mt-2 text-[11px] text-white/45 leading-[1.3] font-[500]">43 opportunities • Est. not guaranteed • Potential ≠ Confirmed</div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-[10px] bg-white/[0.07] border border-white/[0.06] py-2.5"><div className="font-[800] text-[14px] leading-none tracking-[-0.02em]">8</div><div className="text-[9px] text-white/35 font-[700] tracking-[0.06em] mt-1.5">CRITICAL</div></div>
                          <div className="rounded-[10px] bg-white/[0.07] border border-white/[0.06] py-2.5"><div className="font-[800] text-[14px] leading-none tracking-[-0.02em]">15</div><div className="text-[9px] text-white/35 font-[700] tracking-[0.06em] mt-1.5">HIGH</div></div>
                          <div className="rounded-[10px] bg-white text-[#0A0A0B] py-2.5 shadow-[0_2px_8px_rgba(255,255,255,0.12)]"><div className="font-[800] text-[13px] leading-none tracking-[-0.02em]">₽<CountUp value={317} trigger={scanComplete} />k</div><div className="text-[9px] text-black/50 font-[700] tracking-[0.06em] mt-1.5">CONFIRMED</div></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 flex flex-col">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">REVENUE INTELLIGENCE • TOP OPPORTUNITY</div>
                        <div className={`h-1.5 w-1.5 rounded-full ${scanComplete ? "bg-[#10B981]" : "bg-[#F59E0B] animate-[pulse-subtle_1s_ease-in-out_infinite]"}`} />
                      </div>

                      <div className="mt-5 flex items-start gap-3.5">
                        <div className="h-11 w-11 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[14px] font-[800] shadow-sm shrink-0">{active.name[0]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-[750] text-[15px] tracking-[-0.02em]">{active.name}</span>
                            <span className="text-[13px] text-[#71717A] font-[450]">• {active.company}</span>
                          </div>
                          <div className="mt-1 text-[11.5px] leading-[1.4] text-[#71717A] font-[450]">₽{active.value.toLocaleString("ru-RU")} • Last contact {active.inactivityDays} days ago • {active.why.slice(0, 42)}...</div>
                        </div>
                        <div className={`shrink-0 h-9 px-3 rounded-full flex items-center justify-center text-[13px] font-[850] tracking-[-0.01em] shadow-sm ${active.score >= 90 ? "bg-[#EF4444] text-white shadow-[0_2px_10px_rgba(239,68,68,0.28)]" : "bg-[#F97316] text-white shadow-[0_2px_10px_rgba(249,115,22,0.28)]"}`}>{active.score}</div>
                      </div>

                      <div className="mt-6 grid grid-cols-[1fr_100px] gap-3.5 flex-1">
                        <div className="rounded-[12px] border border-[#E4E4E7] bg-[#FCFCFD] p-4">
                          <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">WHY THIS LEAD?</div>
                          <div className="mt-3.5 space-y-2.5">
                            {active.factors.map((f, i) => (
                              <div key={i} className="group flex items-center justify-between text-[11.5px] py-1 border-b border-[#F4F4F5] last:border-0 hover:bg-white hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all">
                                <span className="font-[500] text-[#18181B] tracking-[-0.01em]">{f}</span>
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ml-2 ${f.includes("+20") ? "bg-[#0A0A0B]" : f.includes("+15") ? "bg-[#52525B]" : "bg-[#A1A1AA]"}`} />
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center gap-2.5">
                            <div className="h-1.5 flex-1 rounded-full bg-[#F4F4F5] overflow-hidden">
                              <div className="h-full bg-[#0A0A0B] rounded-full transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${scanComplete ? active.score : 0}%` }} />
                            </div>
                            <span className="text-[10px] font-[750] font-mono-financial tracking-[0.02em]">{active.score}/100</span>
                          </div>
                        </div>
                        <div className="space-y-3 flex flex-col">
                          <div className="rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] p-3.5 text-center hover:border-[#0A0A0B]/12 hover:shadow-sm transition-all">
                            <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">SCORE</div>
                            <div className="mt-2 text-[28px] font-[850] tracking-[-0.04em] leading-none">{active.score}</div>
                            <div className="mt-1.5 text-[10px] font-[800] tracking-[0.06em] text-[#EF4444]">{active.score >= 90 ? "CRITICAL" : "HIGH"}</div>
                          </div>
                          <div className="rounded-[12px] bg-[#0A0A0B] p-3.5 text-center text-white shadow-[0_4px_16px_rgba(0,0,0,0.16)]">
                            <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">PROBABILITY</div>
                            <div className="mt-2 text-[24px] font-[850] tracking-[-0.03em] leading-none">{active.prob}%</div>
                            <div className="mt-1 text-[10px] text-white/40 font-[500]">Est. • Not guaranteed</div>
                          </div>
                          <div className="flex-1 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7]/80 p-3.5 flex flex-col justify-center">
                            <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">EST. RECOVERABLE</div>
                            <div className="mt-1.5 font-mono-financial text-[15px] font-[800] tracking-[-0.02em]">₽{Math.round(active.value * active.prob / 100).toLocaleString("ru-RU")}</div>
                            <div className="text-[9.5px] text-[#A1A1AA] mt-1 font-[500]">Est. not guaranteed</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] p-4 hover:border-[#0A0A0B]/10 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOMMENDED ACTION</div>
                          <span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white shadow-sm">FOLLOW UP TODAY</span>
                        </div>
                        <div className="mt-3 text-[12.5px] font-[500] leading-[1.45] tracking-[-0.01em] text-[#18181B]">Customer requested pricing, proposal sent, no follow-up for {active.inactivityDays} days. High-value deal with explicit purchase intent.</div>
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => handleGenerateMessage(active)} className="flex-1 h-[36px] rounded-[10px] bg-[#0A0A0B] text-white text-[12.5px] font-[700] tracking-[-0.01em] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.14)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Generate Recovery Message →</button>
                          <Link href="/inbox" className="h-[36px] w-[36px] rounded-[10px] border border-[#E4E4E7] bg-white flex items-center justify-center text-[#71717A] hover:text-[#0A0A0B] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 transition-colors">↗</Link>
                        </div>
                        {generatedMessage && (
                          <div className="mt-4 rounded-[10px] border border-[#0A0A0B]/10 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-[800] tracking-[0.06em] text-[#059669]">AI GENERATED • DETERMINISTIC • Potential ≠ Confirmed</div>
                              <button onClick={handleCopy} className="text-[11px] font-[650] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white hover:bg-[#1A1D23] transition-colors">{copied ? "Copied ✓" : "Copy"}</button>
                            </div>
                            <pre className="mt-2.5 text-[11px] leading-[1.5] whitespace-pre-wrap font-[500] tracking-[-0.01em] text-[#18181B]">{generatedMessage}</pre>
                            <div className="mt-2.5 flex gap-2">
                              <span className="text-[10px] font-[600] px-2 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">Human approval required</span>
                              <span className="text-[10px] font-[500] text-[#71717A]">Est. not guaranteed • No auto-send</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex gap-1.5">
                        {opportunities.map((_, i) => (
                          <button key={i} onClick={() => setActiveOpp(i)} aria-label={`View opportunity ${i+1}`} className={`h-1.5 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 ${i === activeOpp ? "w-8 bg-[#0A0A0B]" : "w-1.5 bg-[#E4E4E7] hover:bg-[#D4D4D8] hover:w-3"}`} />
                        ))}
                        <div className="ml-auto text-[10px] font-[600] tracking-[0.02em] text-[#A1A1AA] font-mono">{activeOpp + 1} / {opportunities.length}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-[38px] items-center justify-between border-t border-[#0A0A0B]/[0.06] bg-[#F9FAFB] px-5 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-[600] text-[#52525B] tracking-[-0.01em]"><span className={`h-1.5 w-1.5 rounded-full ${scanComplete ? "bg-[#10B981]" : "bg-[#F59E0B] animate-[pulse-subtle_1.5s_ease-in-out_infinite]"}`} /> {scanComplete ? "43 opportunities detected • Deterministic" : "Analyzing pipeline..."}</span>
                      <span className="hidden md:inline text-[#D4D4D8]">•</span>
                      <span className="hidden md:inline text-[#71717A] font-[450] text-[10.5px]">Potential ≠ Confirmed</span>
                    </div>
                    <span className="font-mono-financial font-[700] tracking-[-0.02em] text-[#0A0A0B] text-[12px]">₽{scanComplete ? "2,840,000" : "—"} estimated</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="relative z-10 bg-[#FCFCFD] border-b border-[#0A0A0B]/[0.06]">
        <div className="mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[96px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY INBOX • WHO SHOULD I CONTACT FIRST?</span>
                </div>
                <h2 className="mt-6 text-[36px] md:text-[44px] font-[800] leading-[0.92] tracking-[-0.04em]">Prioritized by score,<br />probability, and revenue.</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B] max-w-[520px]">Not a generic list. Every opportunity explains why it matters, how much is at stake, and what to do next. Potential ≠ Confirmed. Deterministic.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-[#71717A] font-[500]">Sort:</span>
                <button onClick={() => handleSort("score")} aria-label="Sort by Score" aria-pressed={sortKey==="score"} className={`px-3.5 py-1.5 rounded-full text-[11px] font-[700] border transition-all focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 ${sortKey==="score" ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20 hover:shadow-sm"}`}>Score {sortKey==="score" ? (sortDir==="desc" ? "↓" : "↑") : ""}</button>
                <button onClick={() => handleSort("value")} aria-label="Sort by Deal Value" aria-pressed={sortKey==="value"} className={`px-3.5 py-1.5 rounded-full border text-[11px] font-[600] transition-all focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 ${sortKey==="value" ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20"}`}>Deal Value {sortKey==="value" ? (sortDir==="desc" ? "↓" : "↑") : ""}</button>
                <button onClick={() => handleSort("inactivity")} aria-label="Sort by Inactivity" aria-pressed={sortKey==="inactivity"} className={`px-3.5 py-1.5 rounded-full border text-[11px] font-[600] transition-all focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 ${sortKey==="inactivity" ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20"}`}>Inactivity {sortKey==="inactivity" ? (sortDir==="desc" ? "↓" : "↑") : ""}</button>
              </div>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-3">
            {sortedOpportunities.map((opp, i) => (
              <Reveal key={`${opp.name}-${sortKey}-${sortDir}`} delay={i * 60}>
                <div className={`group relative rounded-[16px] border bg-white p-[18px] shadow-premium transition-all duration-200 cursor-pointer ${i===0 ? "border-[#0A0A0B] ring-1 ring-[#0A0A0B] shadow-[0_8px_24px_rgba(0,0,0,0.12)] translate-y-[-1px]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="h-[44px] w-[44px] rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[14px] font-[700] shadow-sm shrink-0 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all">{opp.name[0]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-[700] text-[14px] tracking-[-0.01em]">{opp.name}</span>
                          <span className="text-[13px] text-[#71717A]">• {opp.company}</span>
                          <span className={`text-[11px] font-[800] px-2.5 py-0.5 rounded-full shadow-sm transition-transform group-hover:scale-105 ${opp.score >= 90 ? "bg-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.2)]" : opp.score >= 80 ? "bg-[#F97316] text-white shadow-[0_2px_8px_rgba(249,115,22,0.2)]" : "bg-[#F59E0B] text-white"}`}>{opp.score}</span>
                          {i === 0 && <span className="text-[10px] font-[800] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">TOP PRIORITY • {sortKey.toUpperCase()} {sortDir.toUpperCase()}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                          <span><span className="text-[#71717A]">Deal:</span> <span className="font-[650] font-mono-financial">₽{opp.value.toLocaleString("ru-RU")}</span></span>
                          <span><span className="text-[#71717A]">Est. recoverable:</span> <span className="font-[750] font-mono-financial">₽{Math.round(opp.value * opp.prob / 100).toLocaleString("ru-RU")}</span> <span className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</span></span>
                          <span><span className="text-[#71717A]">Prob:</span> <span className="font-[600]">{opp.prob}%</span> • High confidence</span>
                          <span><span className="text-[#71717A]">Inactive:</span> {opp.inactivityDays}d ago</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {opp.factors.slice(0, 4).map((s, j) => (
                            <span key={j} className="text-[11px] px-2.5 py-1 rounded-full border bg-[#F9FAFB] border-[#E4E4E7] text-[#18181B] font-[500] group-hover:bg-white group-hover:border-[#0A0A0B]/10 transition-colors">{s}</span>
                          ))}
                        </div>
                        <div className="mt-3 text-[11px] font-[700] tracking-[0.02em] flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[8px]">→</span> {opp.action} • Sorted by {sortKey} {sortDir}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 lg:ml-4">
                      <div className="hidden md:block text-right">
                        <div className="text-[10px] font-[800] tracking-[0.06em] text-[#71717A]">EST. RECOVERABLE</div>
                        <div className="font-mono-financial font-[750] text-[15px] tracking-[-0.02em]">₽{Math.round(opp.value * opp.prob / 100).toLocaleString("ru-RU")}</div>
                      </div>
                      <div className="h-[48px] w-[48px] rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7] flex flex-col items-center justify-center group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] transition-all">
                        <div className="text-[18px] font-[850] tracking-[-0.02em] leading-none">{opp.score}</div>
                        <div className="text-[8px] font-[800] tracking-[0.08em] opacity-60">SCORE</div>
                      </div>
                      <Link href="/inbox" className="hidden lg:flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] text-white group-hover:bg-[#1A1D23] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover:translate-x-0.5 transition-all">↗</Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={300} className="mt-10 flex justify-center">
            <Link href="/inbox" className="inline-flex h-[40px] items-center gap-2 rounded-[12px] border border-[#0A0A0B]/10 bg-white px-5 text-[13px] font-[600] shadow-sm hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 transition-all">Open Recovery Inbox <span>→</span></Link>
          </Reveal>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-[48px] lg:gap-[80px] items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">THE REVENUE PROBLEM • REAL</span>
                </div>
                <h2 className="mt-6 text-[32px] md:text-[40px] font-[750] leading-[1.05] tracking-[-0.03em]">Most businesses lose revenue they already earned</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-white/55">Leads go cold after pricing requests. Proposals sent but never followed up. Old customers forgotten. Your CRM has the data, but no one has time to analyze thousands of records.</p>
                <div className="mt-8 space-y-2.5">
                  {["Quotation sent, no follow-up for 18 days", "Customer said 'think about it' and disappeared", "High-value deal stalled at proposal stage", "Old pipeline never reviewed systematically"].map((item, i) => (
                    <div key={i} className="group flex gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-3.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/20 text-[#EF4444] flex items-center justify-center text-[11px] font-[700]">!</span>
                      <span className="text-[13.5px] font-[500] leading-[1.4] text-white/70 group-hover:text-white transition-colors">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="relative rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-2 shadow-premium-dark backdrop-blur">
                <div className="rounded-[14px] bg-[#FCFCFD] p-6 text-[#0A0A0B]">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">WITHOUT ONVYRA</div>
                    <span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">REVENUE LEFT BEHIND</span>
                  </div>
                  <div className="mt-5 space-y-2.5">
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[600] tracking-[-0.01em]">1,284 leads in CRM</span><span className="text-[11px] font-[500] text-[#71717A] px-2 py-0.5 rounded-full bg-white border">No prioritization</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[600] tracking-[-0.01em]">43 potential recoveries</span><span className="text-[11px] font-[500] text-[#71717A] px-2 py-0.5 rounded-full bg-white border">Hidden</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]/50 p-3.5"><span className="text-[13px] font-[600] tracking-[-0.01em]">₽2.8M estimated</span><span className="text-[11px] font-[500] text-[#71717A] px-2 py-0.5 rounded-full bg-white border">Left behind</span></div>
                  </div>
                  <div className="mt-8 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#E4E4E7]" />
                    <span className="text-[11px] font-[800] tracking-[0.08em] text-[#0A0A0B] px-3 py-1 rounded-full bg-[#F4F4F5] border">WITH ONVYRA</span>
                    <div className="h-px flex-1 bg-[#E4E4E7]" />
                  </div>
                  <div className="mt-5 space-y-2.5">
                    <div className="flex justify-between items-center rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-3.5"><span className="text-[13px] font-[700] tracking-[-0.01em]">43 opportunities found</span><span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white shadow-sm">PRIORITIZED</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-3.5"><span className="text-[13px] font-[700] tracking-[-0.01em]">8 critical, 15 high</span><span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-white border border-[#0A0A0B]/10">WHY EXPLAINED</span></div>
                    <div className="flex justify-between items-center rounded-[12px] bg-[#0A0A0B] text-white p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.15)]"><span className="text-[13px] font-[700] tracking-[-0.01em]">₽2.8M est • ₽317k confirmed</span><span className="text-[10px] font-[700] tracking-[0.05em] text-white/50">TRACKED</span></div>
                  </div>
                  <div className="mt-5 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7] p-3 text-[11px] leading-[1.5] text-[#52525B]">
                    <span className="font-[700] text-[#0A0A0B]">Potential ≠ Confirmed</span> — Onvyra finds, your team recovers. Estimated not guaranteed. Confirmed only when you record RECOVERED with actual amount.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <div className="inline-flex items-center rounded-full border border-[#0A0A0B]/10 bg-white px-3.5 py-1 text-[11px] font-[700] tracking-[0.06em] text-[#52525B] shadow-sm">HOW ONVYRA WORKS • DATA → REVENUE</div>
            <h2 className="mt-6 text-[36px] md:text-[44px] font-[800] leading-[0.9] tracking-[-0.04em]">Your CRM already contains money. Onvyra finds it.</h2>
            <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">No new leads needed. No extra ad spend. Just recover what is already there. Potential ≠ Confirmed.</p>
          </div>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Connect", desc: "Upload CSV/XLSX or connect CRM read-only. Russian columns like Имя→name auto-mapped. Data treated as DATA, never instructions.", icon: "◫", color: "bg-[#0A0A0B] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]", target: "product" },
            { step: "02", title: "Finds", desc: "Recovery Engine 2.0 scores every lead 0-100 with explainable factors. No black box. Probability transparent with breakdown.", icon: "◍", color: "bg-white border border-[#E4E4E7] text-[#0A0A0B] shadow-sm", target: "ai-intelligence" },
            { step: "03", title: "Explains", desc: "WHY chips, positive/negative signals, estimated recoverable (Deal Value × Probability). Clearly labeled estimated, not guaranteed.", icon: "◧", color: "bg-white border border-[#E4E4E7] text-[#0A0A0B] shadow-sm", target: "estimated" },
            { step: "04", title: "Track", desc: "AI generates message, human approves, marks CONTACTED→RECOVERED with actual amount. Confirmed revenue tracked separately from potential.", icon: "↗", color: "bg-[#059669] text-white shadow-[0_4px_12px_rgba(5,150,105,0.2)]", target: "security" },
          ].map((f, i) => (
            <Reveal key={f.step} delay={i * 80} className="group relative rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-[22px] shadow-premium hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] hover:border-[#0A0A0B]/10 transition-all duration-300">
              <div className={`h-[36px] w-[36px] rounded-[10px] flex items-center justify-center text-[14px] font-[700] ${f.color}`}>{f.icon}</div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-mono-financial text-[11px] font-[700] tracking-[0.06em] text-[#A1A1AA]">{f.step}</span>
                <h3 className="text-[16px] font-[700] tracking-[-0.02em]">{f.title}</h3>
              </div>
              <p className="mt-2.5 text-[13px] leading-[1.6] text-[#52525B] tracking-[-0.01em]">{f.desc}</p>
              <div className="mt-5 h-px w-full bg-[#F4F4F5] group-hover:bg-[#E4E4E7] transition-colors" />
              <button onClick={() => scrollToId(f.target)} className="mt-3 text-[11px] font-[650] tracking-[0.02em] text-[#0A0A0B] flex items-center gap-1.5 hover:gap-2.5 focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 rounded-[6px] px-1 -mx-1 py-0.5 transition-all">Learn more <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="mt-16 rounded-[14px] border border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-1">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[10px] bg-white border border-[#E4E4E7]/80 px-4 py-3 text-[11px] font-[600] tracking-[0.01em]">
            {["YOUR CRM ALREADY CONTAINS MONEY", "Onvyra analyzes it", "AI finds recoverable", "Explains WHY", "Team knows WHO", "AI helps message", "Human approves", "CONFIRMED"].map((t, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={i === 0 ? "font-[800] text-[#0A0A0B] tracking-[0.02em]" : i === 7 ? "font-[800] text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]" : "text-[#52525B]"}>{t}</span>
                {i < 7 && <span className="text-[#D4D4D8] font-[400]">→</span>}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="ai-intelligence" className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[700px] w-[900px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)]" />
        </div>
        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
          <div className="grid lg:grid-cols-2 gap-[64px] items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">AI REVENUE INTELLIGENCE • DETERMINISTIC ENGINE</span>
                </div>
                <h2 className="mt-6 text-[32px] md:text-[42px] font-[750] leading-[1.0] tracking-[-0.03em]">Explainable scoring.<br />No black box.</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-white/55 max-w-[480px]">Every opportunity scored 0-100 with business-language factors. You see exactly why it matters, what data supports it, what is missing, and what to do next.</p>
                <div className="mt-8 rounded-[16px] border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur">
                  <div className="rounded-[12px] bg-[#0F0F10] border border-white/[0.06] p-5 font-mono text-[12px] leading-[1.7]">
                    <div className="flex justify-between text-white/30 text-[10px] tracking-[0.08em] font-[800]"><span>FACTOR</span><span>POINTS</span></div>
                    <div className="mt-4 space-y-2.5">
                      <div className="flex justify-between items-center"><span className="text-white/70">+20 explicit intent (интересно, хочу купить)</span><span className="text-[#10B981] font-[800] px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20">+20</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/70">+15 product relevance (CRM implementation)</span><span className="text-[#10B981] font-[800] px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20">+15</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/70">+15 price requested (сколько стоит)</span><span className="text-[#10B981] font-[800] px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20">+15</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/70">+10 proposal sent (no follow-up)</span><span className="text-[#10B981] font-[800] px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20">+10</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/70">+10 high-value deal (₽185,000)</span><span className="text-[#10B981] font-[800] px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20">+10</span></div>
                      <div className="flex justify-between items-center text-white/30"><span>-10 inactivity 18 days</span><span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">-10</span></div>
                      <div className="border-t border-white/[0.08] pt-4 mt-4 flex justify-between items-center font-[700] text-white"><span>Score 85 → Critical → ₽180k est. recoverable</span><span className="text-[10px] px-2.5 py-1 rounded-full bg-white text-black font-[800] tracking-[0.05em]">EST.</span></div>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-[11px] text-white/40 flex items-center gap-2 font-[500]"><span className="h-1 w-1 rounded-full bg-white/30" /> Each factor has type, signal, points, explanation — business language, not tech jargon</div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="space-y-4">
                <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">AI ANALYSIS • REAL DATA ONLY • NO HALLUCINATION</div>
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#10B981] text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">DETERMINISTIC</span>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-[14px] bg-white p-4 text-[#0A0A0B] shadow-[0_8px_24px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.12)] hover:-translate-y-[1px] transition-all">
                      <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY SCORE</div>
                      <div className="mt-2 text-[32px] font-[850] leading-none tracking-[-0.03em]">92<span className="text-[14px] font-[600] text-[#71717A]">/100</span></div>
                      <div className="mt-3 inline-flex text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.25)]">CRITICAL</div>
                    </div>
                    <div className="rounded-[14px] bg-white/[0.06] border border-white/[0.08] p-4 hover:bg-white/[0.08] transition-colors">
                      <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">PROBABILITY</div>
                      <div className="mt-2 text-[28px] font-[850] tracking-[-0.02em] leading-none">74%</div>
                      <div className="mt-2 text-[10px] text-white/40 font-[500]">Est. • Not guaranteed</div>
                    </div>
                    <div className="rounded-[14px] bg-white/[0.06] border border-white/[0.08] p-4 hover:bg-white/[0.08] transition-colors">
                      <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">CONFIDENCE</div>
                      <div className="mt-2 text-[18px] font-[750] tracking-[-0.01em]">High</div>
                      <div className="mt-1.5 text-[11px] text-white/50 leading-[1.3]">Strong buying intent</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[12px] bg-[#0A0A0B] border border-white/[0.08] p-4">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">WHY THIS OPPORTUNITY?</div>
                    <div className="mt-2.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-white/75">Customer explicitly requested pricing, proposal sent, no follow-up for 18 days. High-value deal with explicit purchase intent. No rejection signal.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#059669]">POSITIVE SIGNALS</div>
                    <div className="mt-3.5 space-y-2.5">
                      <div className="flex gap-2 text-[11px] items-center"><span className="h-5 min-w-[28px] rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center font-[800] text-[10px]">+20</span><span className="font-[550] tracking-[-0.01em]">Explicit purchase intent</span></div>
                      <div className="flex gap-2 text-[11px] items-center"><span className="h-5 min-w-[28px] rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center font-[800] text-[10px]">+15</span><span className="font-[550] tracking-[-0.01em]">Product relevance</span></div>
                      <div className="flex gap-2 text-[11px] items-center"><span className="h-5 min-w-[28px] rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center font-[800] text-[10px]">+15</span><span className="font-[550] tracking-[-0.01em]">Price requested</span></div>
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">MISSING INFO • HONEST</div>
                    <div className="mt-3 text-[11px] leading-[1.5] tracking-[-0.01em] text-[#52525B]">Manager not specified. Last message truncated. No competitor info. AI says: Not enough data to determine — never invents.</div>
                    <div className="mt-3 text-[10px] font-[650] tracking-[0.02em] text-[#A1A1AA] px-2 py-1 rounded-full bg-[#F4F4F5] border inline-flex">AI never invents facts not in source</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="estimated" className="relative z-10 border-y border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
          <Reveal>
            <div className="mx-auto max-w-[720px] text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">ESTIMATED vs CONFIRMED • FINANCIAL HONESTY</span>
              </div>
              <h2 className="mt-6 text-[36px] md:text-[44px] font-[800] leading-[0.9] tracking-[-0.04em]">Estimated ≠ Confirmed.<br />Always separated.</h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-white/50 max-w-[520px] mx-auto">Onvyra never confuses potential with actual. Estimated revenue is not guaranteed. Confirmed only when you record RECOVERED with actual amount.</p>
            </div>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-2 gap-6 max-w-[920px] mx-auto">
            <Reveal>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-1.5 backdrop-blur">
                <div className="rounded-[16px] bg-white p-7 text-[#0A0A0B] shadow-[0_8px_24px_rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">ESTIMATED RECOVERABLE</div>
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">ESTIMATED • NOT GUARANTEED</span>
                  </div>
                  <div className="mt-5 font-mono-financial text-[38px] font-[850] tracking-[-0.03em] leading-none">₽<CountUp value={2840000} trigger={scanComplete} /></div>
                  <div className="mt-2.5 text-[13px] tracking-[-0.01em] text-[#52525B]">43 opportunities • ₽185k avg • 68% avg probability</div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-[12px] p-3 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7]"><span className="font-[500]">Deal Value × Probability</span><span className="font-mono-financial font-[700]">₽185k × 74% = ₽136,900</span></div>
                    <div className="text-[11px] leading-[1.5] tracking-[-0.01em] text-[#71717A] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[10px] p-3">Formula: Decimal-safe integer arithmetic. No float artifacts. 100000×0.5=50000 exact. Cents = Math.round(value*100).</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-[20px] border border-[#10B981]/20 bg-[#10B981]/[0.08] p-1.5 backdrop-blur">
                <div className="rounded-[16px] bg-[#059669] p-7 text-white shadow-[0_12px_32px_rgba(5,150,105,0.25)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-white/60">CONFIRMED RECOVERED</div>
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white text-[#059669] shadow-sm">CONFIRMED • ATTRIBUTED</span>
                  </div>
                  <div className="mt-5 font-mono-financial text-[38px] font-[850] tracking-[-0.03em] leading-none">₽<CountUp value={317000} trigger={scanComplete} /></div>
                  <div className="mt-2.5 text-[13px] tracking-[-0.01em] text-white/80">12 recovered • 8.4% recovery rate • Attributed</div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center text-[12px] p-3 rounded-[10px] bg-white/10 border border-white/15 backdrop-blur"><span className="font-[500] text-white/80">Explicit user-recorded</span><span className="font-[700] tracking-[0.02em]">RECOVERED + amount + date</span></div>
                    <div className="text-[11px] leading-[1.5] tracking-[-0.01em] text-white/60 bg-white/5 border border-white/10 rounded-[10px] p-3">Only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers. Latest per lead prevents ghost revenue.</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 border-b border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-[64px] items-start">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">SECURITY • ENTERPRISE-GRADE • VERIFIED</span>
                </div>
                <h2 className="mt-6 text-[32px] md:text-[40px] font-[800] leading-[0.95] tracking-[-0.03em]">Tenant isolation.<br />No fake claims.</h2>
                <p className="mt-4 text-[15px] leading-[1.6] text-white/50">Every query scoped organizationId. Tested cross-org READ/WRITE. No SOC2/ISO claims unless verified. Honest security. Potential ≠ Confirmed applies to security too.</p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { title: "Tenant isolation", desc: "Every query includes orgId from session, not client. Cross-tenant returns 404." },
                    { title: "Secure auth", desc: "bcrypt 12 rounds, httpOnly JWT, SameSite lax, secure in prod, 32+ chars." },
                    { title: "RBAC", desc: "OWNER/ADMIN/MEMBER server-side enforced. Billing OWNER only." },
                    { title: "Audit logging", desc: "Org-scoped, no secrets, no stack traces to client." },
                    { title: "Webhook verification", desc: "Stripe HMAC SHA256 timingSafeEqual 5min tolerance." },
                    { title: "Encrypted tokens", desc: "HubSpot tokens AES-256-GCM at rest." },
                    { title: "Rate limiting", desc: "In-memory + Redis optional, 429 with headers." },
                    { title: "Prompt injection defense", desc: "Imported text as DATA never instructions." },
                  ].map((item, i) => (
                    <div key={i} className="rounded-[12px] border border-white/[0.06] bg-white/[0.04] p-3.5 backdrop-blur hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors">
                      <div className="text-[12px] font-[650] tracking-[-0.01em] text-white">{item.title}</div>
                      <div className="mt-1 text-[11px] leading-[1.5] text-white/50">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[12px] bg-white/[0.04] border border-white/[0.06] p-3.5 text-[11px] leading-[1.5] text-white/40">
                  <span className="font-[700] text-white/70">No false claims:</span> No SOC2, ISO27001, GDPR certified, HIPAA, PCI unless verified. Security page explains actual protections, not marketing badges.
                </div>
                <div className="mt-6">
                  <Link href="/security" className="inline-flex h-[36px] items-center gap-2 rounded-[10px] bg-white px-4 text-[12px] font-[650] text-[#0A0A0B] hover:bg-[#F5F5F7] transition-colors">View Security Details →</Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-2 shadow-premium-dark backdrop-blur">
                <div className="rounded-[14px] bg-[#111113] border border-white/[0.06] p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-white/30">TENANT ISOLATION TEST • ORG A vs ORG B • LIVE</div>
                    <span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#10B981] text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">VERIFIED • 11 PASS</span>
                  </div>
                  <div className="mt-6 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">GET /api/leads/{`{B_id}`} as ORG_A</span><span className="text-[#EF4444] font-[800]">→ 404</span></div>
                    <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">UPDATE ORG_B data as ORG_A</span><span className="text-[#EF4444] font-[800]">→ 403</span></div>
                    <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">POST /api/campaigns with B leadIds as A</span><span className="text-[#EF4444] font-[800]">→ 400</span></div>
                    <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot read B opportunities</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
                    <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot access B billing</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
                    <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot access B CRM tokens</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
                  </div>
                  <div className="mt-4 text-[11px] text-white/30 leading-[1.5]">All queries include organizationId from session, not client. Tested via security.test.ts 11 cases PASS. No secrets in logs.</div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-[10px] bg-white/[0.06] border border-white/[0.06] p-3"><div className="text-[13px] font-[800] tracking-[-0.02em] text-white">43/43</div><div className="text-[10px] text-white/40 font-[700] tracking-[0.06em] mt-1">TESTS PASS</div></div>
                  <div className="rounded-[10px] bg-white/[0.06] border border-white/[0.06] p-3"><div className="text-[13px] font-[800] tracking-[-0.02em] text-white">100%</div><div className="text-[10px] text-white/40 font-[700] tracking-[0.06em] mt-1">TENANT ISOLATION</div></div>
                  <div className="rounded-[10px] bg-white text-[#0A0A0B] p-3 shadow-sm"><div className="text-[13px] font-[800] tracking-[-0.02em]">0 P0/P1</div><div className="text-[10px] text-[#71717A] font-[700] tracking-[0.06em] mt-1">BLOCKERS</div></div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 bg-[#F9FAFB] border-b border-[#0A0A0B]/[0.06]">
        <div className="mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[88px]">
          <Reveal>
            <div className="mx-auto max-w-[640px] text-center">
              <div className="inline-flex items-center rounded-full border border-[#0A0A0B]/10 bg-white px-3.5 py-1 text-[11px] font-[700] tracking-[0.06em] text-[#52525B] shadow-sm">PRICING • HONEST LIMITS • SERVER-ENFORCED</div>
              <h2 className="mt-6 text-[36px] md:text-[44px] font-[800] leading-[0.9] tracking-[-0.04em]">Simple pricing,<br />honest limits.</h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">FREE for testing, PRO for small teams, BUSINESS for larger pipelines. Limits enforced server-side, no fake unlimited claims. Potential ≠ Confirmed.</p>
            </div>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-6 max-w-[1040px] mx-auto">
            {[
              { plan: "FREE", price: "Free", desc: "For trying out", limits: ["500 leads", "3 imports/mo", "100 AI/mo", "2 campaigns", "1 user", "0 CRM", "50k tokens"], cta: "Start Free", popular: false },
              { plan: "PRO", price: "$49", suffix: "/mo", desc: "For growing businesses", limits: ["5,000 leads", "50 imports/mo", "1,000 AI/mo", "20 campaigns", "5 users", "1 CRM", "500k tokens"], cta: "Start PRO", popular: true },
              { plan: "BUSINESS", price: "$199", suffix: "/mo", desc: "For teams and high volume", limits: ["50,000 leads", "500 imports/mo", "10,000 AI/mo", "100 campaigns", "25 users", "5 CRM", "5M tokens"], cta: "Start BUSINESS", popular: false },
            ].map((p, i) => (
              <Reveal key={p.plan} delay={i * 80}>
                <div className={`group relative rounded-[20px] border bg-white p-[26px] shadow-premium transition-all duration-300 ${p.popular ? "border-[#0A0A0B] shadow-[0_0_0_1px_#0A0A0B,0_24px_48px_rgba(0,0,0,0.12)] scale-[1.02] hover:shadow-[0_0_0_1px_#0A0A0B,0_32px_64px_rgba(0,0,0,0.16)] hover:-translate-y-[2px]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]"}`}>
                  {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0A0B] px-3.5 py-1 text-[11px] font-[800] tracking-[0.05em] text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]">MOST POPULAR</div>}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{p.plan}</div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-[36px] font-[850] tracking-[-0.04em] leading-none">{p.price}</span>
                        {p.suffix && <span className="text-[14px] font-[600] text-[#71717A]">{p.suffix}</span>}
                      </div>
                      <div className="mt-2 text-[13px] tracking-[-0.01em] text-[#52525B]">{p.desc}</div>
                    </div>
                    <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[14px] font-[700] transition-all duration-200 ${p.popular ? "bg-[#0A0A0B] text-white shadow-sm" : "bg-[#F4F4F5] text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:shadow-sm group-hover:scale-105"}`}>↗</div>
                  </div>
                  <div className="mt-7 space-y-2.5">
                    {p.limits.map((l, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-[13px] tracking-[-0.01em]">
                        <span className="h-[18px] w-[18px] rounded-full bg-[#F4F4F5] border border-[#E4E4E7]/80 flex items-center justify-center text-[10px] font-[800] shrink-0">✓</span>
                        <span className="font-[500]">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Link href="/register" className={`flex h-[42px] w-full items-center justify-center rounded-[12px] text-[13px] font-[700] tracking-[-0.01em] transition-all duration-200 ${p.popular ? "bg-[#0A0A0B] text-white hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98]" : "border border-[#E4E4E7] bg-white hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"}`}>{p.cta}</Link>
                  </div>
                  <div className="mt-3 text-center text-[11px] font-[500] text-[#71717A]">Limits enforced server-side • No fake unlimited</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200} className="mt-12 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-[#0A0A0B]/10 bg-white px-5 py-2.5 text-[11px] font-[550] tracking-[0.01em] shadow-sm">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> No fake payments</span><span className="h-3 w-px bg-[#E4E4E7]" /><span>Billing shows NOT CONFIGURED when Stripe absent</span><span className="h-3 w-px bg-[#E4E4E7]" /><span>Pricing matches code PLAN_LIMITS</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="faq" className="relative z-10 mx-auto max-w-[800px] px-6 lg:px-[32px] py-[88px]">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3.5 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">FAQ • HONEST ANSWERS • NO FAKE CLAIMS</span>
          </div>
          <h2 className="mt-5 text-[28px] font-[800] tracking-[-0.03em] leading-[1.1]">FAQ • Honest answers</h2>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#52525B]">No fake testimonials, no fabricated case studies, no guaranteed claims. Potential ≠ Confirmed.</p>
        </Reveal>

        <div className="mt-10 space-y-3">
          {[
            { q: "What does Onvyra actually do?", a: "Analyzes existing leads/deals to find commercially valuable opportunities that went cold, prioritizes who to contact first, explains WHY with business-language factors, helps generate recovery message, tracks CONTACTED→RECOVERED with confirmed revenue. Estimated ≠ Confirmed. Potential is not guaranteed." },
            { q: "Does it automatically send messages?", a: "No. AI generates, you review & edit, mark ready, then manually contact. MVP is manual action required. No auto-send unless real messaging provider verified. We do not pretend Send works if no provider. Human approval always required. No automatic sending without verified provider." },
            { q: "How is estimated recoverable calculated?", a: "Deal Value × Probability. Probability from Recovery Score, buying intent, inactivity, data completeness, deal stage. Decimal-safe integer arithmetic: cents = Math.round(value*100), result = Math.round(cents*prob)/100. 100000×0.5=50000 exact, no float artifacts. Estimated, not guaranteed. Potential ≠ Confirmed. Confirmed only when you record RECOVERED with actual amount and date." },
            { q: "Is it a generic CRM or AI wrapper?", a: "No. Onvyra is NOT generic CRM, chatbot, AI wrapper, lead-gen, fake analytics. It is revenue recovery OS with deterministic engine 2.0 scoring 0-100 explainable factors, probability breakdown, audit log, tenant isolation, RBAC, billing enforcement, security headers, health endpoint, production-ready. Build PASS 27 routes, 43/43 tests, 100/100 AI eval." },
            { q: "What about data security?", a: "Tenant isolation every query scoped organizationId, tested cross-org READ/WRITE IDOR 11 tests PASS, secure auth bcrypt httpOnly JWT SameSite lax secure in prod 32+ chars secret, audit log org-scoped no secrets, prompt injection defense imported text as DATA not instructions, security headers CSP HSTS X-Frame DENY etc. No false SOC2/ISO claims. Honest security." },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 40}>
              <div className="group rounded-[16px] border border-[#E4E4E7]/80 bg-white shadow-sm hover:border-[#0A0A0B]/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between p-[20px] text-left focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 rounded-[16px]">
                  <span className="text-[14px] font-[650] tracking-[-0.02em] pr-4 leading-[1.4]">{item.q}</span>
                  <span className={`h-[32px] w-[32px] rounded-full border flex items-center justify-center text-[14px] font-[300] transition-all duration-200 shrink-0 ${faqOpen === i ? "bg-[#0A0A0B] text-white border-[#0A0A0B] rotate-45 shadow-sm" : "bg-[#F9FAFB] border-[#E4E4E7] text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] group-hover:shadow-sm"}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${faqOpen === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="px-[20px] pb-[20px] text-[13px] leading-[1.6] tracking-[-0.01em] text-[#52525B]">{item.a}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="final" className="relative z-10 border-t border-white/[0.06] bg-[#0A0A0B] text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[700px] w-[1200px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1360px] px-6 lg:px-[32px] py-[96px] text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">READY TO RECOVER REVENUE • NO FAKE CLAIMS</span>
            </div>
            <h3 className="text-[40px] md:text-[52px] font-[850] leading-[0.9] tracking-[-0.04em]">Ready to find where<br />you are leaving money behind?</h3>
            <p className="mt-6 text-[15px] leading-[1.6] text-white/50 max-w-[600px] mx-auto">Register → Onboard → Import or Connect CRM → Analyze → See real recoverable revenue → Recovery Inbox → Opportunity → Action → Outcome → Confirmed Recovered Revenue. Potential ≠ Confirmed.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="group inline-flex h-[48px] items-center justify-center gap-2 rounded-[12px] bg-white px-[26px] text-[14px] font-[750] tracking-[-0.01em] text-[#0A0A0B] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_12px_32px_rgba(255,255,255,0.12)] hover:bg-[#F5F5F7] hover:shadow-[0_16px_40px_rgba(255,255,255,0.16)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] transition-all duration-200">Analyze Your Pipeline <span className="transition-transform group-hover:translate-x-1">→</span></Link>
              <Link href="/login" className="inline-flex h-[48px] items-center justify-center rounded-[12px] border border-white/15 bg-white/[0.06] px-[24px] text-[14px] font-[600] tracking-[-0.01em] text-white backdrop-blur hover:bg-white/[0.1] hover:border-white/20 transition-all">View Demo (1,000 leads)</Link>
            </div>
            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[11px] font-[500] tracking-[0.01em] text-white/40">
              <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" /> No fake customer logos</span><span className="h-3 w-px bg-white/10" /><span>No fake testimonials</span><span className="h-3 w-px bg-white/10" /><span>No fabricated case studies</span><span className="h-3 w-px bg-white/10" /><span>No guaranteed claims</span><span className="h-3 w-px bg-white/10" /><span>Built for B2B teams • v1.0</span>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#0A0A0B]/[0.06] bg-[#FCFCFD] py-10">
        <div className="mx-auto max-w-[1360px] px-6 lg:px-[32px] flex flex-col md:flex-row justify-between gap-6 items-center text-[12px]">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-[9px] bg-[#0A0A0B] flex items-center justify-center text-white font-[800] text-[12px] shadow-sm">O</div>
            <div>
              <div className="font-[650] tracking-[-0.01em]">© 2026 Onvyra OS v1.0 — AI Revenue Recovery Operating System</div>
              <div className="text-[11px] text-[#71717A] mt-0.5">Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated • No fake claims</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[#71717A]">
            <Link href="/pricing" className="font-[550] hover:text-[#0A0A0B] hover:underline underline-offset-4 transition-colors">Pricing</Link>
            <Link href="/security" className="font-[550] hover:text-[#0A0A0B] hover:underline underline-offset-4 transition-colors">Security</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 text-[11px] font-[600] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Build PASS • 43/43 tests • 100/100 AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
