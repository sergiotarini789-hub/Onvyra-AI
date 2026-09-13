"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isDemo = params.get("demo") === "1";
  const [email, setEmail] = useState(isDemo ? "demo@onvyra.ai" : "");
  const [password, setPassword] = useState(isDemo ? "demo12345" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoSeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Demo seed failed");
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@onvyra.ai", password: "demo12345" }),
      });
      if (!loginRes.ok) throw new Error("Login after demo seed failed");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD] flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
            <div className="h-[36px] w-[36px] rounded-[11px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800] text-[15px] shadow-sm group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] group-hover:-translate-y-[0.5px] transition-all">O</div>
            <span className="font-[700] text-[16px] tracking-[-0.02em]">Onvyra</span>
            <span className="ml-1 h-[20px] items-center rounded-full bg-[#0A0A0B] px-2 text-[10px] font-[800] tracking-[0.04em] text-white hidden md:inline-flex">OS v1.0</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-[28px] font-[750] tracking-[-0.025em] leading-[1.1]">Sign in to Onvyra</h1>
            <p className="mt-3 text-[14px] leading-[1.5] text-[#52525B]">Enter your credentials to access your revenue recovery operating system. Tenant isolated. Secure auth.</p>
          </div>

          {isDemo && (
            <div className="mb-6 rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <div className="font-[700] text-[13px] text-[#92400E]">Demo Mode • 1,000 leads</div>
              <p className="mt-1 text-[12px] leading-[1.5] text-[#B45309]">This will load 1,000 synthetic leads marked as DEMO DATA. Use demo@onvyra.ai / demo12345 or click Seed Demo. Metrics from real demo data, not hardcoded.</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-[10px]" onClick={handleDemoSeed} disabled={loading}>
                {loading ? "Seeding..." : "Seed Demo & Sign In →"}
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">EMAIL</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">PASSWORD</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="••••••••" />
            </div>
            {error && <div className="text-[12px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-[11px] p-3 font-[500]">{error}</div>}
            <Button type="submit" className="w-full h-[44px] rounded-[11px] bg-[#0A0A0B] hover:bg-[#1A1D23] text-[14px] font-[650] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? "Signing in..." : "Sign in →"}
            </Button>
          </form>

          <div className="mt-8 text-center text-[13px] text-[#71717A]">
            Don&apos;t have an account? <Link href="/register" className="font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Create organization</Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#71717A]">
            <span className="h-px w-8 bg-[#E4E4E7]" />
            <span>Potential ≠ Confirmed • Tenant isolated • Secure auth</span>
            <span className="h-px w-8 bg-[#E4E4E7]" />
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-[11px] font-[600] text-[#71717A] hover:text-[#0A0A0B]">← Back to landing</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-[#0A0A0B] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v32H0z' fill='none'/%3E%3Cpath d='M0 0h1v32H0zM0 0h32v1H0z' fill='white' fill-opacity='0.5'/%3E%3C/svg%3E")` }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-white/70">AI REVENUE RECOVERY OS • LIVE</span>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur">
            <div className="rounded-[14px] bg-white p-6 text-[#0A0A0B]">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERABLE REVENUE • ESTIMATED</div>
              <div className="mt-3 font-mono-financial text-[32px] font-[850] tracking-[-0.03em]">₽2,840,000</div>
              <div className="mt-1 text-[12px] text-[#71717A]">43 opportunities • 8 critical • 15 high • Est. not guaranteed</div>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#0A0A0B] text-white"><span className="text-[12px] font-[600]">Ivan Petrov • Acme LLC</span><span className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-[#EF4444]">92</span></div>
                <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#F9FAFB] border"><span className="text-[12px] font-[500]">Maria Sokolova • Beta Corp</span><span className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-[#F97316] text-white">88</span></div>
              </div>
            </div>
          </div>
          <h2 className="mt-8 text-[28px] font-[750] leading-[1.05] tracking-[-0.025em]">Your CRM already<br />contains money.</h2>
          <p className="mt-3 text-[14px] leading-[1.6] text-white/60">Onvyra finds it, explains WHY, tells you WHO to contact first, helps with message, tracks CONFIRMED recovered revenue.</p>
        </div>
        <div className="relative text-[11px] text-white/40">© 2026 Onvyra OS v1.0 • Potential ≠ Confirmed • Tenant isolated • Secure auth • No fake claims</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
