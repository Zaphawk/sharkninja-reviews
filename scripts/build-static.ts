/**
 * Emits a single self-contained HTML page of the dashboard, for sharing a link
 * without hosting anything. Every figure comes from the same functions the app
 * renders from, so the two cannot drift.
 *
 *   npx tsx scripts/build-static.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  allBrandTotals,
  brandStats,
  bucketTable,
  cloudFor,
  dateRange,
  reviewsForSku,
  skuStats,
  themesFor,
  trend,
} from "../lib/aggregate";
import { amazonUrl, BRANDS, SKUS } from "../lib/skus";
import type { Brand, Review } from "../lib/types";

const seed = JSON.parse(
  readFileSync(join(process.cwd(), "data", "seed.json"), "utf8"),
) as { generatedAt: string; reviews: Review[] };

const reviews = seed.reviews;
const range = dateRange(reviews)!;

const monthLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const brandViews: Record<string, unknown> = {};
for (const brand of BRANDS as Brand[]) {
  const s = brandStats(brand, reviews);
  brandViews[brand.toLowerCase()] = {
    brand,
    all: s.all,
    verified: s.verified,
    rankedFrom: s.rankedFrom,
    top: s.topPerformer && {
      id: s.topPerformer.sku.id,
      name: s.topPerformer.sku.name,
      avg: s.topPerformer.verified.avg,
      n: s.topPerformer.verified.n,
      pctNegative: s.topPerformer.verified.pctNegative,
    },
    bottom: s.needsAttention && {
      id: s.needsAttention.sku.id,
      name: s.needsAttention.sku.name,
      avg: s.needsAttention.verified.avg,
      n: s.needsAttention.verified.n,
      pctNegative: s.needsAttention.verified.pctNegative,
    },
    skus: s.skus.map((x) => ({
      id: x.sku.id,
      name: x.sku.name,
      all: x.all,
      verified: x.verified,
      insufficient: x.insufficient,
    })),
    clouds: {
      positive: cloudFor(s.reviews, "positive", brand),
      negative: cloudFor(s.reviews, "negative", brand),
    },
    themes: {
      positive: themesFor(s.reviews, "positive", brand, 3),
      negative: themesFor(s.reviews, "negative", brand, 3),
    },
    buckets: bucketTable(s.reviews),
  };
}

const skuViews: Record<string, unknown> = {};
for (const sku of SKUS) {
  const mine = reviewsForSku(reviews, sku.id);
  const stats = skuStats(sku, reviews);
  skuViews[sku.id] = {
    id: sku.id,
    name: sku.name,
    brand: sku.brand,
    model: sku.model ?? null,
    url: amazonUrl(sku),
    all: stats.all,
    verified: stats.verified,
    insufficient: stats.insufficient,
    clouds: {
      positive: cloudFor(mine, "positive", sku),
      negative: cloudFor(mine, "negative", sku),
    },
    themes: {
      positive: themesFor(mine, "positive", sku, 5),
      negative: themesFor(mine, "negative", sku, 5),
    },
    buckets: bucketTable(mine),
    trend: trend(mine),
    reviews: mine.map((r) => ({
      rating: r.rating,
      title: r.title,
      body: r.body,
      reviewer: r.reviewer,
      date: r.reviewDate,
      verified: r.verified,
      buckets: r.buckets,
    })),
  };
}

const data = {
  totalReviews: reviews.length,
  skuCount: SKUS.length,
  rangeLabel: `${monthLabel(range.from)} – ${monthLabel(range.to)}`,
  collectedLabel: new Date(seed.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  brands: allBrandTotals(reviews).map((b) => ({
    ...b,
    slug: b.brand.toLowerCase(),
  })),
  brandViews,
  skuViews,
};

const template = readFileSync(join(process.cwd(), "scripts", "static-template.html"), "utf8");

// Review text is arbitrary customer prose. Two things it must not do on the
// way into an inline <script>: close the tag, or be read as a replacement
// pattern ("$&", "$'") by String.replace. Hence the escaping and the function
// form of replace.
const payload = JSON.stringify(data)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");
const html = template.replace("__DATA__", () => payload);

mkdirSync(join(process.cwd(), "out"), { recursive: true });
const outPath = join(process.cwd(), "out", "review-sentiment.html");
writeFileSync(outPath, html);
console.log(`${outPath} — ${(html.length / 1024).toFixed(0)} KB, ${reviews.length} reviews`);
