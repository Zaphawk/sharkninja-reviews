import Link from "next/link";
import { portfolio } from "@/lib/aggregate";
import { loadReviews } from "@/lib/data";
import { snapshotGeneratedAt, usingSnapshot } from "@/lib/store";
import {
  DirectionPill,
  Panel,
  SentimentBar,
  SentimentLegend,
  Stars,
  StatTile,
} from "@/components/Stat";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reviews = await loadReviews();

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
        <h1 className="text-lg font-bold">No reviews loaded yet</h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-60">
          Import an Amazon review export to get started. Drop in the Ninja and
          Shark workbooks and the dashboard fills itself in.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-block rounded-md bg-teal px-4 py-2 text-[14px] font-semibold text-white hover:bg-teal-dark"
        >
          Import data
        </Link>
      </div>
    );
  }

  const port = portfolio(reviews);
  const range = port.range;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Sentiment Overview</h1>
          <p className="mt-1 text-[13px] text-ink-60">
            Portfolio performance across SharkNinja India listings on Amazon.in
            {range ? (
              <>
                {" "}· {formatMonth(range.from)} to {formatMonth(range.to)}
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-canvas"
        >
          Import Data
        </Link>
      </div>

      {usingSnapshot() ? (
        <p className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[12px] text-ink-60">
          Snapshot of the export collected{" "}
          <span className="font-semibold text-ink">
            {new Date(snapshotGeneratedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          . Connect PostgreSQL (Neon) to import new workbooks from the browser.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Reviews"
          value={reviews.length}
          sub={`${port.verified.n} verified purchases (${Math.round((port.verified.n / reviews.length) * 100)}%)`}
        />
        <StatTile
          label="Verified Rating"
          value={
            <span className="text-2xl">
              <Stars value={port.verified.avg} />
            </span>
          }
          sub={`${port.verified.avg?.toFixed(2)} verified average out of 5.0`}
          tone={port.verified.avg && port.verified.avg >= 4.0 ? "good" : "bad"}
        />
        <StatTile
          label="Declining Listings"
          value={port.falling.length}
          sub={
            port.falling.length > 0
              ? port.falling.map((f) => f.sku.name).join(", ")
              : "No SKUs currently falling"
          }
          tone={port.falling.length > 0 ? "bad" : "good"}
        />
        <StatTile
          label="Top Complaint Area"
          value={port.topProblem ? port.topProblem.bucket : "None"}
          sub={
            port.topProblem
              ? `${port.topProblem.count} complaints (${port.topProblem.pct.toFixed(0)}% of negatives)`
              : "No negative reviews recorded"
          }
          tone={port.topProblem ? "bad" : "neutral"}
        />
      </div>

      {/* Brand Rollups */}
      <div className="grid gap-5 sm:grid-cols-2">
        {port.brands.map((t) => (
          <Link
            key={t.brand}
            href={`/${t.brand.toLowerCase()}`}
            className="group rounded-xl border border-line bg-surface p-5 transition hover:border-ink hover:shadow-xs"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight group-hover:text-teal">
                {t.brand}
              </h2>
              <span className="text-[12px] text-ink-40">
                {t.skuCount} SKUs · {t.all.n} reviews
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl">
                <Stars value={t.verified.avg} />
              </span>
              <span className="text-[12px] text-ink-40">
                verified average · n={t.verified.n}
              </span>
            </div>

            <div className="mt-4">
              <SentimentBar s={t.verified} />
            </div>
            <div className="mt-2">
              <SentimentLegend s={t.verified} />
            </div>

            <p className="mt-4 text-[13px] font-semibold text-teal">
              View all {t.brand} products →
            </p>
          </Link>
        ))}
      </div>

      {/* Master SKU Table Ranked Worst-First */}
      <Panel
        title="All Listings Ranked (Attention Priority)"
        subtitle="Ranked worst-first on verified purchase average so critical issues remain visible. Small sample size listings (<10 verified) sink below active lines."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-40">
                <th className="pb-2.5">Product</th>
                <th className="pb-2.5">Brand</th>
                <th className="pb-2.5 text-right">Verified Avg</th>
                <th className="pb-2.5 text-center">Trend</th>
                <th className="pb-2.5 text-right">% Negative</th>
                <th className="pb-2.5 pl-4">Top Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {port.skus.map((s) => (
                <tr
                  key={s.sku.id}
                  className="transition hover:bg-canvas"
                >
                  <td className="py-3">
                    <Link
                      href={`/${s.brand.toLowerCase()}/${s.sku.id}`}
                      className="font-semibold hover:text-teal"
                    >
                      {s.sku.name}
                    </Link>
                    {s.insufficient ? (
                      <span className="ml-2 rounded border border-warn-line bg-warn-bg px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                        low data
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 text-ink-60">{s.brand}</td>
                  <td className="tabular py-3 text-right font-medium">
                    <Stars value={s.verified.avg} />
                  </td>
                  <td className="py-3 text-center">
                    <DirectionPill d={s.direction} />
                  </td>
                  <td className="tabular py-3 text-right text-ink-60">
                    {s.all.n === 0 ? "—" : `${s.all.pctNegative.toFixed(0)}%`}
                  </td>
                  <td className="py-3 pl-4 text-[12px] text-ink-40">
                    {s.topProblem ? (
                      <span>
                        <span className="font-semibold text-ink-60">
                          {s.topProblem.bucket}
                        </span>{" "}
                        ({s.topProblem.pct.toFixed(0)}%)
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function formatMonth(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
