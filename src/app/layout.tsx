import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onvyra — Find the customers your business is leaving behind",
  description:
    "Onvyra analyzes your existing leads and customer data to identify stalled opportunities, estimate recoverable revenue, and show your team who to contact next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 font-sans">{children}</body>
    </html>
  );
}
