import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { loadReviews } from "@/lib/data";
import { getStore, snapshotGeneratedAt, usingSnapshot } from "@/lib/store";
import { dateRange } from "@/lib/aggregate";
import { Panel } from "@/components/Stat";
import { TemplatePanel } from "@/components/TemplatePanel";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const store = getStore();
  await store.init();
  const [reviews, imports] = await Promise.all([
    loadReviews(),
    store.listImports(),
  ]);
  const range = dateRange(reviews);
  const snapshot = usingSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import data</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-snug text-ink-60">
          Drop in an Excel file or a CSV and the dashboard fills itself in. The
          template below is the shape to aim for; the older workbooks, one
          pasted sheet per SKU, still import exactly as before.
        </p>
      </div>

      {snapshot ? (
        <div className="rounded-lg border border-warn-line bg-warn-bg p-4 text-[13px] text-warn">
          <b>This deployment is showing a snapshot.</b> No database is connected,
          so it is serving the export baked in on{" "}
          {new Date(snapshotGeneratedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {". Everything on the dashboard is real, but importing is switched off until a "}
          <code>DATABASE_URL</code>
          {" is set — a read-only host has nowhere to put new reviews. The template below is still the right thing to fill in."}
        </div>
      ) : (
        <UploadForm />
      )}

      <TemplatePanel />

      <Panel
        title="What is loaded"
        subtitle={
          reviews.length === 0
            ? "Nothing yet"
            : `${reviews.length} reviews${range ? `, dated ${range.from} to ${range.to}` : ""}`
        }
      >
        {reviews.length > 0 ? (
          <Link
            href="/"
            className="inline-block rounded-md bg-teal px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[color:var(--color-teal-bright)]"
          >
            Open the dashboard
          </Link>
        ) : (
          <p className="text-[13px] text-ink-60">
            Import a workbook and the dashboard fills itself in.
          </p>
        )}
      </Panel>

      {imports.length > 0 ? (
        <Panel title="Import history" subtitle="Most recent first">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-60">
                <th className="pb-2 font-semibold">When</th>
                <th className="pb-2 font-semibold">File</th>
                <th className="pb-2 text-right font-semibold">Parsed</th>
                <th className="pb-2 text-right font-semibold">Added</th>
                <th className="pb-2 text-right font-semibold">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((i) => (
                <tr key={i.id} className="border-b border-line-soft last:border-0">
                  <td className="py-2 text-ink-60">
                    {new Date(i.createdAt).toLocaleString("en-GB")}
                  </td>
                  <td className="py-2">{i.filename}</td>
                  <td className="tabular py-2 text-right">{i.report.parsed}</td>
                  <td className="tabular py-2 text-right font-semibold">
                    {i.report.inserted}
                  </td>
                  <td className="tabular py-2 text-right text-ink-60">
                    {i.report.duplicates}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}
    </div>
  );
}
