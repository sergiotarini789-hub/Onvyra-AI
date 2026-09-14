"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LeadDetailActions({ leadId, message }: { leadId: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message);
  const [revealed, setRevealed] = useState(false);

  // Animate reveal
  useState(() => {
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  });

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
    <div className="space-y-4">
      <div className="relative rounded-[14px] border border-[#E4E4E7] bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E4E4E7]/80 bg-[#F9FAFB] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">AI GENERATED MESSAGE • HUMAN APPROVAL REQUIRED</span>
          </div>
          <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">READY FOR REVIEW</span>
        </div>
        <div className={`p-5 text-[13px] leading-[1.7] whitespace-pre-wrap transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          {regenLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-[600] text-[#71717A]">
                <span className="h-3 w-3 rounded-full border-2 border-[#E4E4E7] border-t-[#0A0A0B] animate-spin" />
                Generating recovery message...
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-[#F4F4F5] animate-pulse" />
                <div className="h-3 w-[90%] rounded-full bg-[#F4F4F5] animate-pulse" />
                <div className="h-3 w-[80%] rounded-full bg-[#F4F4F5] animate-pulse" />
              </div>
            </div>
          ) : (
            currentMessage
          )}
        </div>
        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/80 text-[11px] text-[#71717A] flex items-center gap-2">
          <span>✓ No monetary values invented • No discounts • No deadlines • No customer statements</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copy} className="rounded-[10px]">{copied ? "✓ Copied!" : "Copy Message"}</Button>
        <Button size="sm" variant="outline" onClick={regenerate} disabled={regenLoading} className="rounded-[10px]">{regenLoading ? "Generating..." : "Regenerate"}</Button>
        <Button size="sm" onClick={markContacted} className="rounded-[10px] bg-[#0A0A0B] hover:bg-[#1A1D23]">Mark Contacted →</Button>
      </div>
      
      <div className="rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-3 text-[11px] leading-[1.5] text-[#92400E]">
        <span className="font-[700]">Human approval required before sending.</span> AI NEVER auto-sends. You review, edit, approve, then manually contact. No automatic message sending without verified provider.
      </div>
    </div>
  );
}
