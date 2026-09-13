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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Onvyra</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your credentials to access your revenue recovery dashboard.</p>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-medium text-amber-900">Demo Mode</div>
          <p className="mt-1 text-amber-800">This will load 1,000 synthetic leads marked as DEMO DATA. Use demo@onvyra.ai / demo12345 or click Seed Demo.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleDemoSeed} disabled={loading}>
            {loading ? "Seeding..." : "Seed Demo & Sign In"}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" placeholder="you@company.com" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" placeholder="••••••••" />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account? <Link href="/register" className="font-medium text-slate-900 hover:underline">Create organization</Link>
      </div>
      <div className="mt-4 text-center">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">← Back to landing</Link>
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
