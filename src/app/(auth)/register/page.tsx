"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", organizationName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
            <h1 className="text-[28px] font-[750] tracking-[-0.025em] leading-[1.1]">Create your organization</h1>
            <p className="mt-3 text-[14px] leading-[1.5] text-[#52525B]">Start recovering revenue from your existing leads in minutes. Tenant isolated. Secure auth. No fake claims.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">ORGANIZATION NAME</label>
              <Input value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="Acme Inc" />
            </div>
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">YOUR NAME</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="Ivan Petrov" />
            </div>
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">WORK EMAIL</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-[11px] font-[700] tracking-[0.06em] text-[#71717A]">PASSWORD</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-2 h-[44px] rounded-[11px] border-[#E4E4E7] bg-white focus:border-[#0A0A0B]/20 focus:ring-[#0A0A0B]/10" placeholder="Min 8 characters" />
              <p className="mt-2 text-[11px] text-[#71717A]">Securely hashed with bcrypt 10 rounds • httpOnly JWT • SameSite lax • secure in production</p>
            </div>
            {error && <div className="text-[12px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-[11px] p-3 font-[500]">{error}</div>}
            <Button type="submit" className="w-full h-[44px] rounded-[11px] bg-[#0A0A0B] hover:bg-[#1A1D23] text-[14px] font-[650] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? "Creating..." : "Create organization →"}
            </Button>
          </form>

          <div className="mt-8 text-center text-[13px] text-[#71717A]">
            Already have an account? <Link href="/login" className="font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Sign in</Link>
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
            <span className="text-[11px] font-[700] tracking-[0.06em] text-white/70">REVENUE RECOVERY OS • SECURE</span>
          </div>
        </div>
        <div className="relative">
          <div className="space-y-4">
            <div className="flex gap-3"><div className="h-8 w-8 rounded-full bg-white text-[#0A0A0B] flex items-center justify-center font-[800] text-[12px]">1</div><div><div className="font-[650] text-[14px]">Connect your pipeline</div><div className="text-[12px] text-white/60 mt-1">CSV/XLSX or CRM read-only • Russian columns auto-mapped</div></div></div>
            <div className="flex gap-3"><div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-[700] text-[12px]">2</div><div><div className="font-[650] text-[14px]">AI finds recoverable revenue</div><div className="text-[12px] text-white/60 mt-1">Explainable scoring 0-100 • Why chips • Probability • Est. recoverable</div></div></div>
            <div className="flex gap-3"><div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-[700] text-[12px]">3</div><div><div className="font-[650] text-[14px]">Team recovers • Confirmed tracked</div><div className="text-[12px] text-white/60 mt-1">Human approval required • No auto-send • Potential ≠ Confirmed</div></div></div>
          </div>
          <h2 className="mt-10 text-[28px] font-[750] leading-[1.05] tracking-[-0.025em]">No fake metrics.<br />No fake claims.<br />Just real revenue.</h2>
        </div>
        <div className="relative text-[11px] text-white/40">© 2026 Onvyra OS v1.0 • Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated</div>
      </div>
    </div>
  );
}
