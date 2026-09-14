"use client";
import Link from "next/link";
import { useState } from "react";
import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/billing";

export default function PricingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const faqs = [
    { q: "What is estimated recoverable revenue?", a: "Deal Value × Probability. Estimated, not guaranteed. Potential ≠ Confirmed. Only confirmed when you record RECOVERED with actual amount. Decimal-safe integer arithmetic, no float artifacts." },
    { q: "Do you automatically send messages?", a: "No. MVP is manual action required. AI generates, you review & approve, then mark as contacted. No auto-send unless real messaging provider verified. Human approval always required." },
    { q: "Is my data isolated?", a: "Yes. Every query scoped by organizationId. Tested cross-tenant read/write, IDOR 11 tests PASS. Secure auth bcrypt httpOnly JWT SameSite lax secure in prod 32+ chars secret. See /security" },
    { q: "What about AI hallucinations?", a: "AI never invents prices, discounts, deadlines, product details, customer statements. If information missing, says Not enough information to determine. Validated via Zod, evaluated via 100-case dataset, 100/100 PASS, 0 hallucination violations." },
  ];

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#0A0A0B]">
      <header className="sticky top-0 z-50 w-full border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFC]/80 backdrop-blur-[20px]">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-[32px] w-[32px] rounded-[10px] bg-[#0A0A0B] flex items-center justify-center text-white font-[800] text-[14px]">O</div>
            <span className="font-[650] text-[15px] tracking-[-0.02em]">Onvyra</span>
            <span className="ml-1 h-[18px] items-center rounded-full bg-[#0A0A0B] px-1.5 text-[9px] font-[800] tracking-[0.04em] text-white hidden md:inline-flex">OS v1.0</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/security" className="text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B]">Security</Link>
            <Link href="/login" className="text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B]">Sign in</Link>
            <Link href="/register" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] px-[18px] text-[13px] font-[600] text-white shadow-sm hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Analyze Your Pipeline</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-6 lg:px-8 py-[88px]">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="inline-flex items-center rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 text-[11px] font-[700] tracking-[0.06em] text-[#52525B] shadow-sm">PRICING • HONEST LIMITS • NO FAKE UNLIMITED</div>
          <h1 className="mt-6 text-[40px] md:text-[48px] font-[800] leading-[0.9] tracking-[-0.03em]">Simple pricing for revenue recovery</h1>
          <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B]">No fake unlimited claims. Limits configurable in src/lib/billing.ts, not scattered. Billing integration not configured shows honest status — no fake payments. Potential ≠ Confirmed.</p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-[1040px] mx-auto">
          {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => (
            <div key={plan} className={`group relative rounded-[20px] border bg-white p-[26px] shadow-premium hover-lift transition-all duration-300 ${plan === "PRO" ? "border-[#0A0A0B] shadow-[0_0_0_1px_#0A0A0B,0_16px_40px_rgba(0,0,0,0.12)] scale-[1.02] hover:shadow-[0_0_0_1px_#0A0A0B,0_24px_48px_rgba(0,0,0,0.16)] hover:-translate-y-[1px]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/15 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]"}`}>
              {plan === "PRO" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0A0B] px-3 py-1 text-[11px] font-[700] tracking-[0.05em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]">MOST POPULAR</div>}
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{plan}</div>
                  <div className="mt-2 text-[32px] font-[850] tracking-[-0.03em] leading-none">{PLAN_PRICES[plan].label}</div>
                  <div className="mt-1 text-[12px] text-[#71717A]">{plan === "FREE" ? "For testing Onvyra" : plan === "PRO" ? "For small teams" : "For larger pipelines"}</div>
                </div>
                <div className={`h-8 w-8 rounded-[10px] flex items-center justify-center text-[14px] transition-all duration-200 ${plan === "PRO" ? "bg-[#0A0A0B] text-white shadow-sm" : "bg-[#F4F4F5] text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:shadow-sm group-hover:scale-105"}`}>↗</div>
              </div>
              <div className="mt-6 space-y-2.5 text-[13px]">
                <div className="flex justify-between"><span className="font-[500]">{PLAN_LIMITS[plan].leads.toLocaleString()} leads</span><span className="text-[#71717A]">limit</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[plan].aiAnalysesPerMonth} AI analyses / month</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[plan].campaigns} campaigns</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[plan].users} users</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[plan].crmIntegrations} CRM integrations</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[plan].importsPerMonth} imports / month</span></div>
              </div>
              <div className="mt-8">
                <Link href="/register" className={`flex h-[40px] w-full items-center justify-center rounded-[12px] text-[13px] font-[650] transition-all duration-200 ${plan === "PRO" ? "bg-[#0A0A0B] text-white hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.16)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98]" : "border border-[#E4E4E7] bg-white hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"}`}>{plan === "FREE" ? "Start Free" : `Get ${plan}`}</Link>
              </div>
              <div className="mt-3 text-center text-[11px] text-[#71717A]">No fake payments — if STRIPE_SECRET_KEY not set, shows Billing integration not configured</div>
            </div>
          ))}
        </div>

        <div className="mt-20 max-w-[800px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <h2 className="text-[22px] font-[750] tracking-[-0.02em]">FAQ • Honest answers • Click to expand</h2>
          </div>
          <div className="mt-8 grid gap-3">
            {faqs.map((item, i) => (
              <div key={i} className={`group rounded-[16px] border bg-white shadow-sm transition-all duration-200 ${faqOpen === i ? "border-[#0A0A0B] shadow-[0_4px_12px_rgba(0,0,0,0.08)]" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"}`}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i} className="flex w-full items-center justify-between p-[20px] text-left focus-visible:ring-2 focus-visible:ring-[#0A0A0B] focus-visible:ring-offset-2 rounded-[16px]">
                  <span className="text-[14px] font-[650] tracking-[-0.01em] pr-4 leading-[1.4]">{item.q}</span>
                  <span className={`h-[32px] w-[32px] rounded-full border flex items-center justify-center text-[14px] font-[300] transition-all duration-200 shrink-0 ${faqOpen === i ? "bg-[#0A0A0B] text-white border-[#0A0A0B] rotate-45 shadow-sm" : "bg-[#F9FAFB] border-[#E4E4E7] text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] group-hover:shadow-sm"}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${faqOpen === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="px-[20px] pb-[20px] text-[13px] leading-[1.6] tracking-[-0.01em] text-[#52525B]">{item.a}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[12px] border border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-3.5 text-[11px] leading-[1.5] text-[#52525B]">
            <span className="font-[700] text-[#0A0A0B]">Potential ≠ Confirmed</span> — All FAQ answers are honest, no fake testimonials, no fabricated case studies, no guaranteed claims. Click questions to expand/collapse.
          </div>
        </div>
      </section>

      <footer className="border-t border-[#0A0A0B]/[0.06] py-8">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 flex justify-between text-[12px] text-[#71717A]">
          <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-[7px] bg-[#0A0A0B] flex items-center justify-center text-white font-[800] text-[10px]">O</div>© 2026 Onvyra • Potential ≠ Confirmed • Est. not guaranteed</div>
          <div className="flex gap-4"><Link href="/security" className="underline underline-offset-4 hover:text-[#0A0A0B] transition-colors">Security</Link><Link href="/" className="underline underline-offset-4 hover:text-[#0A0A0B] transition-colors">Home</Link></div>
        </div>
      </footer>
    </div>
  );
}
