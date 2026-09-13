"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STANDARD_FIELDS } from "@/lib/import/mapping";
import Link from "next/link";

type Step = "upload" | "mapping" | "importing" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/import/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setColumns(data.columns);
      setRows(data.rows);
      setMapping(data.suggestedMapping);
      setStep("mapping");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    setError("");
    setStep("importing");
    try {
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

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Leads</h1>
        <p className="text-sm text-slate-600 mt-1">Upload CSV or XLSX. AI will suggest column mapping. You confirm before import.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle>Step 1 — Upload File</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="mx-auto max-w-sm space-y-3">
                <div className="text-sm font-medium">CSV or XLSX up to 10MB</div>
                <div className="text-xs text-slate-500">Example columns: Имя, Телефон, Сумма, Последний контакт, Товар, Комментарий</div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="mx-auto block text-sm" />
                {loading && <div className="text-xs text-slate-500">Parsing file...</div>}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border p-4 text-xs">
              <div className="font-medium mb-2">What happens next:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>File validation & column detection</li>
                <li>AI-assisted column mapping (e.g. Имя → name)</li>
                <li>Mapping confirmation</li>
                <li>Normalization & duplicate detection</li>
                <li>AI analysis & scoring</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader><CardTitle>Step 2 — Confirm Mapping ({rows.length} rows detected)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-slate-600">System suggests mapping. Adjust if needed. Original row preserved in rawData.</div>
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr><th className="p-2 text-left">Original Column</th><th className="p-2 text-left">Maps To</th><th className="p-2 text-left">Sample Value</th></tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col} className="border-t">
                      <td className="p-2 font-mono text-xs">{col}</td>
                      <td className="p-2">
                        <select value={mapping[col] || "rawData"} onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })} className="rounded-lg border p-1.5 text-xs w-full">
                          {STANDARD_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-xs truncate max-w-[200px]">{String(rows[0]?.[col] || "").slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>{loading ? "Importing..." : `Confirm & Import ${rows.length} rows`}</Button>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-sm font-medium">Importing {rows.length} rows...</div>
            <div className="mt-2 text-xs text-slate-500">Normalization, duplicate detection, AI analysis in progress.</div>
            <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 animate-pulse w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader><CardTitle>Import Complete</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{result.imported}</div><div className="text-xs text-slate-500">Imported</div></div>
              <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{result.duplicates}</div><div className="text-xs text-slate-500">Duplicates skipped</div></div>
              <div className="rounded-lg border p-4"><div className="text-2xl font-bold">{result.analyzed}</div><div className="text-xs text-slate-500">Analyzed</div></div>
            </div>
            {result.errors?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="font-medium">Errors ({result.errors.length})</div>
                <ul className="mt-1 list-disc pl-4">{result.errors.slice(0, 10).map((e: any, i: number) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            <div className="flex gap-2">
              <Link href="/leads" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">View Leads</Link>
              <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium">Go to Dashboard</Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
