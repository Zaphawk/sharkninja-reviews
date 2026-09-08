import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { loadReviews } from "@/lib/data";
import { getStore, usingEphemeralStore } from "@/lib/store";
import { dateRange } from "@/lib/aggregate";
import { Panel } from "@/components/Stat";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const store = getStore();
  await store.init();
  const [reviews, imports] = await Promise.all([
    loadReviews(),
    store.listImports(),
  ]);
  const range = dateRange(reviews);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import data</h1>
        <p className="mt-1 text-[13px] text-ink-60">
          Amazon blocks automated collection, so reviews are pasted into a
          workbook by hand and dropped in here. One sheet per SKU.
        </p>
      </div>

      {usingEphemeralStore() ? (
        <div className="rounded-lg border border-[#e5b4b0] bg-[#fdefee] p-4 text-[13px] text-[#8f2019]">
          <b>DATABASE_URL is not set.</b> Data is being written to the local
          filesystem, which this host wipes on every deploy. Set DATABASE_URL to
          a Postgres connection string before relying on anything imported here.
        </div>
      ) : null}

      <UploadForm />

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
            className="inline-block rounded-md bg-teal px-4 py-2 text-[13px] font-semibold text-white hover:bg-teal-dark"
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
              <tr className="border-b border-silver-light text-left text-[11px] uppercase tracking-wide text-ink-60">
                <th className="pb-2 font-semibold">When</th>
                <th className="pb-2 font-semibold">File</th>
                <th className="pb-2 text-right font-semibold">Parsed</th>
                <th className="pb-2 text-right font-semibold">Added</th>
                <th className="pb-2 text-right font-semibold">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((i) => (
                <tr key={i.id} className="border-b border-silver-light/60 last:border-0">
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
