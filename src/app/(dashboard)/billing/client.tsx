"use client";
import { useState } from "react";

export default function BillingClient({ currentPlan, orgId, billingConfigured, subscription }: { currentPlan: string; orgId: string; billingConfigured: boolean; subscription: any }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(plan: "PRO" | "BUSINESS") {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.notConfigured) {
          setError("Billing not configured. In production, this would redirect to Stripe Checkout. In dev, plan can be changed manually via API.");
          return;
        }
        setError(data.error || "Failed to create checkout session");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.devMode) {
        setError(null);
        alert(`Plan changed to ${plan} in dev mode (no payment). Refresh to see changes.`);
        window.location.reload();
      }
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {error && <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E] font-[500]">{error}</div>}
      <div className="flex gap-2">
        {currentPlan === "FREE" && (
          <>
            <button onClick={() => handleUpgrade("PRO")} disabled={!!loading} className="h-[40px] px-5 rounded-[11px] bg-[#0A0A0B] text-white text-[13px] font-[700] shadow-sm hover:bg-[#1A1D23] disabled:opacity-50 hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">{loading === "PRO" ? "Processing..." : "Upgrade to PRO - $49/mo →"}</button>
            <button onClick={() => handleUpgrade("BUSINESS")} disabled={!!loading} className="h-[40px] px-5 rounded-[11px] border border-[#E4E4E7] bg-white text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors">{loading === "BUSINESS" ? "Processing..." : "Upgrade to BUSINESS - $199/mo"}</button>
          </>
        )}
        {currentPlan === "PRO" && (
          <button onClick={() => handleUpgrade("BUSINESS")} disabled={!!loading} className="h-[40px] px-5 rounded-[11px] bg-[#0A0A0B] text-white text-[13px] font-[700] shadow-sm hover:bg-[#1A1D23] disabled:opacity-50 transition-all">{loading === "BUSINESS" ? "Processing..." : "Upgrade to BUSINESS →"}</button>
        )}
      </div>
    </>
  );
}
