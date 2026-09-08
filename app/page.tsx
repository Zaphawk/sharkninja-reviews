import Link from "next/link";
import { allBrandTotals, dateRange } from "@/lib/aggregate";
import { loadReviews } from "@/lib/data";
import { SentimentBar, SentimentLegend, Stars } from "@/components/Stat";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reviews = await loadReviews();
  const totals = allBrandTotals(reviews);
  const range = dateRange(reviews);

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-silver bg-white p-10 text-center">
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

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Pick a brand</h1>
        <p className="text-[13px] text-ink-60">
          <span className="tabular font-semibold text-ink">{reviews.length}</span>{" "}
          Amazon.in reviews
          {range ? (
            <>
              {" "}· {formatMonth(range.from)} – {formatMonth(range.to)}
            </>
          ) : null}
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {totals.map((t) => (
          <Link
            key={t.brand}
            href={`/${t.brand.toLowerCase()}`}
            className="group rounded-lg border border-silver-light bg-white p-6 transition hover:border-teal hover:shadow-sm"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight group-hover:text-teal">
                {t.brand}
              </h2>
              <span className="text-[12px] text-ink-60">
                {t.skuCount} SKUs
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl">
                <Stars value={t.verified.avg} />
              </span>
              <span className="text-[12px] text-ink-60">
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
              Open {t.brand} →
            </p>
          </Link>
        ))}
      </div>
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
