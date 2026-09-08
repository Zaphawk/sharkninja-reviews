import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bucketTable,
  cloudFor,
  MIN_VERIFIED_FOR_CONFIDENCE,
  reviewsForSku,
  skuStats,
  themesFor,
  trend,
} from "@/lib/aggregate";
import { loadReviews } from "@/lib/data";
import { amazonUrl, BRANDS, skuById } from "@/lib/skus";
import { BucketBars, ThemeList } from "@/components/Insights";
import {
  InsufficientBadge,
  NotEnough,
  Panel,
  RatingComparison,
} from "@/components/Stat";
import { TrendChart } from "@/components/TrendChart";
import { WordCloudView } from "@/components/WordCloudView";

export const dynamic = "force-dynamic";

export default async function SkuPage({
  params,
}: {
  params: Promise<{ brand: string; sku: string }>;
}) {
  const { brand: brandSlug, sku: skuId } = await params;
  const brand = BRANDS.find((b) => b.toLowerCase() === brandSlug.toLowerCase());
  const sku = skuById(skuId);
  if (!brand || !sku || sku.brand !== brand) notFound();

  const all = await loadReviews();
  const reviews = reviewsForSku(all, sku.id);
  const stats = skuStats(sku, all);
  const positiveCloud = cloudFor(reviews, "positive", sku);
  const negativeCloud = cloudFor(reviews, "negative", sku);
  const positiveThemes = themesFor(reviews, "positive", sku, 5);
  const negativeThemes = themesFor(reviews, "negative", sku, 5);
  const buckets = bucketTable(reviews);
  const trendResult = trend(reviews);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${brand.toLowerCase()}`}
          className="text-[13px] text-ink-60 hover:text-ink"
        >
          ← {brand}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{sku.name}</h1>
          {stats.insufficient ? (
            <InsufficientBadge n={stats.verified.n} />
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-ink-60">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
          {sku.model ? ` · ${sku.model}` : ""} ·{" "}
          <a
            href={amazonUrl(sku)}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-ink"
          >
            listing on Amazon.in
          </a>
        </p>
      </div>

      {stats.insufficient ? (
        <div className="rounded-lg border border-[#e8d5ab] bg-[#fdf9f0] p-4 text-[13px]">
          <b>Read this page as anecdote, not measurement.</b> With{" "}
          {stats.verified.n} verified review
          {stats.verified.n === 1 ? "" : "s"} (the bar is{" "}
          {MIN_VERIFIED_FOR_CONFIDENCE}), a single unhappy customer moves the
          average by a full point. Percentages below are shown for completeness,
          not for decisions.
        </div>
      ) : null}

      <RatingComparison verified={stats.verified} all={stats.all} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="What people praise"
          subtitle={`4–5★ language${positiveCloud.ok ? ` · ${positiveCloud.n} reviews` : ""}`}
        >
          {positiveCloud.ok ? (
            <WordCloudView words={positiveCloud.words} tone="positive" />
          ) : (
            <NotEnough reason={positiveCloud.reason} />
          )}
          <ThemeList themes={positiveThemes} tone="positive" />
        </Panel>

        <Panel
          title="What people complain about"
          subtitle={`1–2★ language${negativeCloud.ok ? ` · ${negativeCloud.n} reviews` : ""}`}
        >
          {negativeCloud.ok ? (
            <WordCloudView words={negativeCloud.words} tone="negative" />
          ) : (
            <NotEnough reason={negativeCloud.reason} />
          )}
          <ThemeList themes={negativeThemes} tone="negative" />
        </Panel>
      </div>

      <Panel
        title="Problem areas"
        subtitle={`${buckets.negatives} negative review${buckets.negatives === 1 ? "" : "s"} for this SKU. A review can sit in more than one area.`}
      >
        <BucketBars rows={buckets.rows} total={buckets.negatives} />
      </Panel>

      <Panel
        title="Rating over time"
        subtitle="Monthly average, verified purchases only"
      >
        {trendResult.ok ? (
          <TrendChart points={trendResult.points} />
        ) : (
          <NotEnough reason={trendResult.reason} />
        )}
      </Panel>

      <Panel
        title="Recent reviews"
        subtitle="Newest first — the raw text behind everything above"
      >
        <ul className="divide-y divide-silver-light">
          {reviews.slice(0, 12).map((r) => (
            <li key={r.hash} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className={`tabular rounded px-1.5 py-0.5 text-[12px] font-bold ${
                    r.rating >= 4
                      ? "bg-teal-tint text-teal-dark"
                      : r.rating === 3
                        ? "bg-silver-light text-ink-60"
                        : "bg-[#fdefee] text-[#c8322b]"
                  }`}
                >
                  {r.rating}★
                </span>
                <span className="text-[13px] font-semibold">{r.title}</span>
                <span className="text-[12px] text-ink-60">
                  {r.reviewer} · {r.reviewDate}
                  {r.verified ? " · verified" : " · unverified"}
                </span>
              </div>
              {r.body ? (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-60">
                  {r.body.length > 320 ? `${r.body.slice(0, 320)}…` : r.body}
                </p>
              ) : (
                <p className="mt-1 text-[12px] italic text-ink-60">
                  Title only — no review body.
                </p>
              )}
              {r.buckets.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.buckets.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-silver-light px-2 py-0.5 text-[11px] text-ink-60"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {reviews.length > 12 ? (
          <p className="mt-3 text-[12px] text-ink-60">
            Showing 12 of {reviews.length}.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
