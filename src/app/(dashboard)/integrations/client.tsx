"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Provider = {
  id: string;
  name: string;
  description: string;
  status: string;
  docs: string;
  connected: boolean;
  integration?: any;
};

export default function IntegrationsClient({ providers, orgId }: { providers: Provider[]; orgId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleAction(providerId: string, action: "connect" | "disconnect" | "sync") {
    setLoading(`${providerId}:${action}`);
    setMessage(null);
    
    try {
      const res = await fetch("/api/integrations/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Action failed" });
        return;
      }
      
      if (action === "connect" && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      
      if (action === "disconnect") {
        setMessage({ type: "success", text: "Disconnected successfully" });
        window.location.reload();
        return;
      }
      
      if (action === "sync") {
        setMessage({ type: "success", text: `Sync completed: ${data.result?.contacts || 0} contacts, ${data.result?.deals || 0} deals. Errors: ${data.result?.errors?.length || 0}` });
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      
      setMessage({ type: "success", text: "Action completed" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <Card className="border-slate-900">
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">CRM Providers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => {
            const configured = p.status === "available" || p.status === "configured";
            const isHubSpot = p.id === "hubspot";
            
            return (
              <div key={p.id} className="rounded-xl border p-5 flex justify-between items-start gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{p.name[0]}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center gap-2">
                      {p.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${p.connected ? "bg-emerald-100 text-emerald-700 border-emerald-200" : configured ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                        {p.connected ? "CONNECTED" : configured ? "READY" : "NOT CONFIGURED"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{p.description}</div>
                    <div className="text-[11px] text-slate-500 mt-2">{p.docs}</div>
                    
                    {isHubSpot && p.integration && (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-slate-50 border p-2.5 text-[11px]">
                          <div className="font-bold">Integration Details</div>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-slate-600">
                            <div>Status: <span className="font-bold">{p.integration.status}</span></div>
                            <div>Last sync: {p.integration.lastSyncAt ? new Date(p.integration.lastSyncAt).toLocaleString() : "Never"}</div>
                            {p.integration.lastSyncStatus && <div>Last result: {p.integration.lastSyncStatus}</div>}
                            {p.integration.externalAccountId && <div>Account: {p.integration.externalAccountId}</div>}
                          </div>
                          {p.integration.lastSyncError && (
                            <div className="mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                              Last error: {p.integration.lastSyncError}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {isHubSpot && !configured && (
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                        <div className="font-bold">HubSpot integration not configured</div>
                        <div className="mt-1">Set <span className="font-mono">HUBSPOT_CLIENT_ID</span> and <span className="font-mono">HUBSPOT_CLIENT_SECRET</span> env variables. Uses OAuth 2.0 with encrypted token storage.</div>
                      </div>
                    )}
                    
                    {isHubSpot && configured && !p.connected && (
                      <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-800">
                        <div className="font-bold">Ready to connect</div>
                        <div className="mt-1">Click Connect to authorize via HubSpot OAuth. READ-ONLY scopes: contacts.read, deals.read, companies.read. No write operations.</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 min-w-[140px]">
                  {isHubSpot ? (
                    <>
                      {!p.connected && configured && (
                        <button
                          onClick={() => handleAction(p.id, "connect")}
                          disabled={!!loading}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-center disabled:opacity-50"
                        >
                          {loading === `${p.id}:connect` ? "Connecting..." : "Connect HubSpot"}
                        </button>
                      )}
                      {p.connected && (
                        <>
                          <button
                            onClick={() => handleAction(p.id, "sync")}
                            disabled={!!loading}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-center disabled:opacity-50"
                          >
                            {loading === `${p.id}:sync` ? "Syncing..." : "Sync Now"}
                          </button>
                          <button
                            onClick={() => handleAction(p.id, "disconnect")}
                            disabled={!!loading}
                            className="text-xs px-3 py-1.5 rounded-lg border bg-white text-slate-600 font-bold text-center disabled:opacity-50"
                          >
                            {loading === `${p.id}:disconnect` ? "..." : "Disconnect"}
                          </button>
                        </>
                      )}
                      {!configured && (
                        <span className="text-xs px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-500 text-center">Not configured</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href="/import" className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-center">Import via CRM</Link>
                    </>
                  )}
                  <Link href="/settings" className="text-[11px] text-slate-500 underline text-center">Settings</Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
