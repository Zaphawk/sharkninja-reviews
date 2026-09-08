"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IngestReport } from "@/lib/types";
import { warningLabel } from "@/lib/validate";

type State =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; reports: IngestReport[] }
  | { status: "error"; message: string; unmapped?: string[] };

export function UploadForm() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function send(files: FileList | File[]) {
    const list = [...files].filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (list.length === 0) {
      setState({
        status: "error",
        message: "Those don't look like review exports. Send .xlsx, .xls or .csv.",
      });
      return;
    }

    setState({ status: "uploading" });
    const form = new FormData();
    for (const f of list) form.append("file", f);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setState({
          status: "error",
          message: json.error ?? "Import failed.",
          unmapped: json.unmappedSheets,
        });
        return;
      }
      setState({ status: "done", reports: json.reports as IngestReport[] });
      router.refresh();
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Import failed.",
      });
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
          dragging ? "border-teal bg-teal-tint" : "border-silver bg-white hover:border-teal"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files && void send(e.target.files)}
        />
        <p className="text-[15px] font-semibold">
          {state.status === "uploading"
            ? "Reading the file…"
            : "Drop the review exports here"}
        </p>
        <p className="mt-1 text-[13px] text-ink-60">
          Both workbooks at once is fine. Re-importing a file you have already
          loaded is safe — duplicates are skipped, not counted twice.
        </p>
      </div>

      {state.status === "error" ? (
        <div className="mt-5 rounded-lg border border-[#e5b4b0] bg-[#fdefee] p-4">
          <p className="text-[13px] font-semibold text-[#8f2019]">
            Nothing was imported.
          </p>
          <p className="mt-1 text-[13px] text-[#8f2019]">{state.message}</p>
        </div>
      ) : null}

      {state.status === "done" ? (
        <div className="mt-5 space-y-4">
          {state.reports.map((r) => (
            <ReportCard key={r.filename} report={r} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReportCard({ report }: { report: IngestReport }) {
  const nothingNew = report.inserted === 0 && report.duplicates > 0;
  return (
    <div className="rounded-lg border border-silver-light bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold">{report.filename}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            nothingNew
              ? "bg-silver-light text-ink-60"
              : "bg-teal-tint text-teal-dark"
          }`}
        >
          {nothingNew ? "Already up to date" : `${report.inserted} new reviews`}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-4">
        <Row label="Rows read" value={report.rowsRead} />
        <Row label="Reviews parsed" value={report.parsed} />
        <Row label="Added" value={report.inserted} />
        <Row label="Already had" value={report.duplicates} />
      </dl>

      {report.dateRange ? (
        <p className="mt-3 text-[12px] text-ink-60">
          Reviews dated {report.dateRange.from} to {report.dateRange.to}.
        </p>
      ) : null}

      {report.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-[#e8d5ab] bg-[#fdf9f0] p-3">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#8a5a00]">
            {report.warnings.length} thing
            {report.warnings.length === 1 ? "" : "s"} to look at
          </p>
          <ul className="mt-1.5 space-y-1 text-[12px] text-[#6b4a10]">
            {report.warnings.map((w, i) => (
              <li key={i}>{warningLabel(w)}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[#8a5a00]">
            These were imported anyway - they are notes on the paste, not errors.
          </p>
        </div>
      ) : null}

      {report.perSku.length > 0 ? (
        <table className="mt-3 w-full text-[13px]">
          <tbody>
            {report.perSku.map((s) => (
              <tr key={s.skuId} className="border-t border-silver-light/70">
                <td className="py-1.5">{s.name}</td>
                <td className="tabular py-1.5 text-right text-ink-60">
                  {s.parsed} parsed
                </td>
                <td className="tabular w-24 py-1.5 text-right">
                  {s.inserted} new
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-60">{label}</dt>
      <dd className="tabular text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
