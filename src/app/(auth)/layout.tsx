export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <div className="hidden lg:flex flex-1 bg-slate-900 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white text-slate-900 flex items-center justify-center font-bold text-sm">O</div>
            <span className="font-semibold">Onvyra</span>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Find the customers your business is leaving behind.</h2>
          <p className="mt-4 text-slate-300 text-sm leading-6">Join sales teams recovering 6-figure revenue from existing leads without new ad spend. Deterministic scoring, explainable AI, tenant-isolated.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-white/10 p-4">
              <div className="text-xl font-bold">1,000+</div>
              <div className="text-xs text-slate-400 mt-1">Demo leads</div>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <div className="text-xl font-bold">₽3.7M</div>
              <div className="text-xs text-slate-400 mt-1">Potential in demo</div>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <div className="text-xl font-bold">92</div>
              <div className="text-xs text-slate-400 mt-1">Max score</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500">© 2026 Onvyra • Potential ≠ guaranteed</div>
      </div>
    </div>
  );
}
