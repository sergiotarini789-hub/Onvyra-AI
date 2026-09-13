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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create your organization</h1>
        <p className="mt-2 text-sm text-slate-600">Start recovering revenue from your existing leads in minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Organization name</label>
          <Input value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required className="mt-1" placeholder="Acme Inc" />
        </div>
        <div>
          <label className="text-sm font-medium">Your name</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Ivan Petrov" />
        </div>
        <div>
          <label className="text-sm font-medium">Work email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" placeholder="you@company.com" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-1" placeholder="Min 8 characters" />
          <p className="mt-1 text-xs text-slate-500">Securely hashed with bcrypt</p>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create organization"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-medium text-slate-900 hover:underline">Sign in</Link>
      </div>
      <div className="mt-4 text-center">
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">← Back to landing</Link>
      </div>
    </div>
  );
}
