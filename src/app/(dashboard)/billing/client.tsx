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
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {error}
        </div>
      )}
      
      <div className="flex gap-2">
        {currentPlan === "FREE" && (
          <>
            <button
              onClick={() => handleUpgrade("PRO")}
              disabled={!!loading}
              className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white font-bold disabled:opacity-50"
            >
              {loading === "PRO" ? "Processing..." : "Upgrade to PRO - $49/mo"}
            </button>
            <button
              onClick={() => handleUpgrade("BUSINESS")}
              disabled={!!loading}
              className="text-sm px-4 py-2 rounded-lg border bg-white font-bold disabled:opacity-50"
            >
              {loading === "BUSINESS" ? "Processing..." : "Upgrade to BUSINESS - $199/mo"}
            </button>
          </>
        )}
        {currentPlan === "PRO" && (
          <button
            onClick={() => handleUpgrade("BUSINESS")}
            disabled={!!loading}
            className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white font-bold disabled:opacity-50"
          >
            {loading === "BUSINESS" ? "Processing..." : "Upgrade to BUSINESS"}
          </button>
        )}
      </div>
    </>
  );
}
