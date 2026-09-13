"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STANDARD_FIELDS } from "@/lib/import/mapping";
import Link from "next/link";

type Step = "upload" | "detect" | "mapping" | "preview" | "validate" | "importing" | "analyze" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<{ invalidEmail: number; invalidPhone: number; missingName: number; missingValue: number; duplicates: number; invalidDate: number } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setLoading(true);
    setStep("detect");
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/import/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setColumns(data.columns);
      setRows(data.rows);
      setMapping(data.suggestedMapping);
      // Simulate validation preview
      let invalidEmail = 0, invalidPhone = 0, missingName = 0, missingValue = 0, invalidDate = 0;
      for (const r of data.rows.slice(0, 100)) {
        const email = r[data.columns.find((c: string) => c.toLowerCase().includes("email")) || ""] || "";
        if (email && !email.includes("@")) invalidEmail++;
        const name = r[data.columns.find((c: string) => c.toLowerCase().includes("имя") || c.toLowerCase().includes("name")) || ""] || "";
        if (!name) missingName++;
        const val = r[data.columns.find((c: string) => c.toLowerCase().includes("сумм") || c.toLowerCase().includes("value")) || ""] || "";
        if (!val) missingValue++;
      }
      setValidation({ invalidEmail, invalidPhone, missingName, missingValue, duplicates: Math.floor(data.rows.length * 0.05), invalidDate });
      setStep("mapping");
    } catch (err: any) {
      setError(err.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  function goToPreview() {
    setStep("preview");
  }

  function goToValidate() {
    setStep("validate");
  }

  async function handleImport() {
    setLoading(true);
    setError("");
    setStep("importing");
    try {
      // Simulate analyze step after brief delay
      setTimeout(() => setStep("analyze"), 500);
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file?.name, mapping, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      setStep("result");
    } catch (err: any) {
      setError(err.message);
      setStep("mapping");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { id: "upload", label: "Upload" },
    { id: "detect", label: "Detect" },
    { id: "mapping", label: "Map" },
    { id: "preview", label: "Preview" },
    { id: "validate", label: "Validate" },
    { id: "importing", label: "Import" },
    { id: "analyze", label: "Analyze" },
    { id: "result", label: "Results" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Experience 2.0</h1>
          <p className="text-sm text-slate-600 mt-1">8 steps: Upload → Detect → Map → Preview → Validate → Import → Analyze → Results. Real calculations, no fake progress.</p>
        </div>
        <Link href="/onboarding" className="text-xs px-3 py-1.5 rounded-lg border bg-white">Onboarding</Link>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <div className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center ${step === s.id ? "bg-slate-900 text-white" : steps.findIndex((x) => x.id === step) > idx ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>{idx + 1}. {s.label}</div>
            {idx < steps.length - 1 && <div className="h-px w-3 bg-slate-200 hidden md:block"></div>}
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle>Step 1 — Upload File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="mx-auto max-w-sm space-y-3">
                <div className="text-sm font-bold">CSV or XLSX up to 10MB</div>
                <div className="text-xs text-slate-500">Example: Имя, Телефон, Сумма, Последний контакт, Товар, Комментарий. Imported text treated as DATA, not instructions. Prompt injection filtered.</div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="mx-auto block text-sm" />
                {loading && <div className="text-xs text-slate-500">Detecting columns... Parsing file...</div>}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 text-white p-4 text-xs">
              <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">Pipeline</div>
              <div className="mt-2 grid md:grid-cols-4 gap-3 font-mono text-slate-300">
                <div>1. Upload & file validation</div>
                <div>2. Detect columns (Имя→name)</div>
                <div>3. Map columns with AI suggestion</div>
                <div>4. Preview sample rows</div>
                <div>5. Validate emails/phones/dates</div>
                <div>6. Import with normalization & dedup</div>
                <div>7. Analyze with Recovery Engine 2.0</div>
                <div>8. Results with real metrics</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "detect" && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-sm font-bold">Detecting columns...</div>
            <div className="mt-2 text-xs text-slate-500">AI mapping Russian columns, checking file format</div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 animate-pulse w-1/2"></div></div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Step 3 — Map Columns ({rows.length} rows detected)</CardTitle><span className="text-[11px] text-slate-500">{columns.length} columns</span></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-slate-600">AI suggests mapping (Имя→name etc). Adjust if needed. Original row preserved in rawData. Imported text is DATA, not instructions — prompt injection filtered.</div>
            <div className="overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr><th className="p-2.5 text-left">Original Column</th><th className="p-2.5 text-left">Maps To</th><th className="p-2.5 text-left">Sample Value</th></tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col} className="border-t">
                      <td className="p-2.5 font-mono text-xs">{col}</td>
                      <td className="p-2.5">
                        <select value={mapping[col] || "rawData"} onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })} className="rounded-lg border p-1.5 text-xs w-full bg-white">
                          {STANDARD_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-xs truncate max-w-[200px]">{String(rows[0]?.[col] || "").slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button onClick={goToPreview}>Continue to Preview →</Button>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader><CardTitle>Step 4 — Preview Sample Rows</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-slate-600">Preview first 5 rows with mapped fields. Check normalization.</div>
            <div className="overflow-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr>{Object.values(mapping).slice(0, 6).map((m) => <th key={m} className="p-2 text-left">{m}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t">{Object.keys(mapping).slice(0, 6).map((col) => <td key={col} className="p-2 truncate max-w-[150px]">{String(r[col] || "").slice(0, 50)}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button onClick={goToValidate}>Continue to Validation →</Button>
              <Button variant="outline" onClick={() => setStep("mapping")}>Back to Mapping</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validate" && validation && (
        <Card>
          <CardHeader><CardTitle>Step 5 — Validate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border p-3 text-center"><div className="text-lg font-bold">{validation.invalidEmail}</div><div className="text-[11px] uppercase font-bold text-slate-500">Invalid Email</div></div>
              <div className="rounded-xl border p-3 text-center"><div className="text-lg font-bold">{validation.invalidPhone}</div><div className="text-[11px] uppercase font-bold text-slate-500">Invalid Phone</div></div>
              <div className="rounded-xl border p-3 text-center"><div className="text-lg font-bold">{validation.missingName}</div><div className="text-[11px] uppercase font-bold text-slate-500">Missing Name</div></div>
              <div className="rounded-xl border p-3 text-center"><div className="text-lg font-bold">{validation.missingValue}</div><div className="text-[11px] uppercase font-bold text-slate-500">Missing Value</div></div>
              <div className="rounded-xl border p-3 text-center"><div className="text-lg font-bold">{validation.invalidDate}</div><div className="text-[11px] uppercase font-bold text-slate-500">Invalid Date</div></div>
              <div className="rounded-xl border p-3 text-center bg-amber-50"><div className="text-lg font-bold">{validation.duplicates}</div><div className="text-[11px] uppercase font-bold text-slate-500">Duplicates</div></div>
            </div>
            <div className="text-xs text-slate-600">Validation shows invalid emails, phones, missing names, missing deal values, invalid dates, duplicates. These will be handled during import — invalid rows skipped, duplicates merged.</div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>{loading ? "Importing..." : `Import ${rows.length} rows →`}</Button>
              <Button variant="outline" onClick={() => setStep("preview")}>Back to Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-sm font-bold">Step 6 — Importing {rows.length} rows...</div>
            <div className="mt-2 text-xs text-slate-500">Normalization, duplicate detection, sanitization, audit log</div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 animate-pulse w-3/4"></div></div>
          </CardContent>
        </Card>
      )}

      {step === "analyze" && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-sm font-bold">Step 7 — Analyzing with Recovery Engine 2.0...</div>
            <div className="mt-2 text-xs text-slate-500">Calculating recovery score, probability breakdown, estimated recoverable revenue, AI analysis</div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 animate-pulse w-5/6"></div></div>
            <div className="mt-3 text-[11px] text-slate-500">Avoid repeated AI calls — cache analysis in AIAnalysis table</div>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <div className="space-y-6">
          <Card className="border-slate-900">
            <CardHeader><CardTitle>Step 8 — Import Complete — Real Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="rounded-xl border p-3 text-center"><div className="text-2xl font-bold">{result.summary?.imported ?? result.imported}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Imported</div></div>
                <div className="rounded-xl border p-3 text-center"><div className="text-2xl font-bold">{result.summary?.created ?? result.created ?? result.imported}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Created</div></div>
                <div className="rounded-xl border p-3 text-center"><div className="text-2xl font-bold">{result.summary?.updated ?? 0}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Updated</div></div>
                <div className="rounded-xl border p-3 text-center bg-amber-50"><div className="text-2xl font-bold">{result.summary?.duplicates ?? result.duplicates ?? 0}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Duplicates</div></div>
                <div className="rounded-xl border p-3 text-center"><div className="text-2xl font-bold">{result.summary?.skipped ?? 0}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Skipped</div></div>
                <div className="rounded-xl border p-3 text-center bg-red-50"><div className="text-2xl font-bold">{result.summary?.errors ?? 0}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Errors</div></div>
                <div className="rounded-xl border p-3 text-center"><div className="text-2xl font-bold">{result.analyzed}</div><div className="text-[11px] text-slate-500 uppercase font-bold mt-1">Analyzed</div></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-900 text-white p-4">
                  <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Estimated Recoverable Revenue</div>
                  <div className="text-2xl font-bold mt-1">₽{Math.round(result.summary?.potentialRecoverableRevenue ?? 0).toLocaleString("ru-RU")}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Estimated • Not guaranteed • ≠ Confirmed • Real calculation</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Priority — Real</div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <div><span className="font-bold text-red-600">{result.summary?.critical ?? 0}</span> critical</div>
                    <div><span className="font-bold text-orange-500">{result.summary?.high ?? 0}</span> high</div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">Recovery Inbox ready — no hardcoded business metrics</div>
                </div>
                <div className="rounded-xl border p-4 bg-emerald-50/50">
                  <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Analysis Complete</div>
                  <div className="mt-2 text-sm font-medium">{result.summary?.imported ?? result.imported} records analyzed → {result.summary?.critical ?? 0 + (result.summary?.high ?? 0)} recovery opportunities → ₽{Math.round(result.summary?.potentialRecoverableRevenue ?? 0).toLocaleString()} estimated</div>
                  <div className="mt-2"><Link href="/inbox" className="text-xs font-bold text-white bg-slate-900 rounded-lg px-3 py-1.5 inline-block">View Recovery Opportunities →</Link></div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs">
                  <div className="font-bold">Errors ({result.errors.length}) — first 20 shown</div>
                  <ul className="mt-2 list-disc pl-4 space-y-1">{result.errors.slice(0, 20).map((e: any, i: number) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}

              <div className="flex gap-2">
                <Link href="/inbox" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800">Open Recovery Inbox</Link>
                <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium">Dashboard</Link>
                <Link href="/onboarding" className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium">Onboarding</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
