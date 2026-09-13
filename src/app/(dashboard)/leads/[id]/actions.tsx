"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LeadDetailActions({ leadId, message }: { leadId: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message);

  function copy() {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (data.message) setCurrentMessage(data.message);
    } catch (e) {
      console.error(e);
    } finally {
      setRegenLoading(false);
    }
  }

  async function markContacted() {
    await fetch(`/api/leads/${leadId}/outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: "responded", note: "Marked as contacted from detail page" }),
    });
    alert("Marked as contacted");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-4 text-sm leading-6 whitespace-pre-wrap">{currentMessage}</div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copy}>{copied ? "Copied!" : "Copy"}</Button>
        <Button size="sm" variant="outline" onClick={regenerate} disabled={regenLoading}>{regenLoading ? "Regenerating..." : "Regenerate"}</Button>
        <Button size="sm" onClick={markContacted}>Mark Contacted</Button>
      </div>
    </div>
  );
}
