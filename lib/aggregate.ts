import { BUCKETS, sentimentOf } from "./types";
import type { Brand, Bucket, Review } from "./types";
import {
  brandTokens,
  brandTokensFor,
  skuById,
  SKUS,
  skusForBrand,
  type Sku,
} from "./skus";
import { themes, wordCloud, type CloudWord, type Theme } from "./text";

/**
 * Thresholds below which a chart would be decoration rather than evidence.
 * This dataset is 339 reviews across 12 SKUs; six SKUs have fewer than ten
 * verified reviews. Rendering a 40-word cloud off three reviews would be
 * inventing a pattern, so these gates are visible in the UI, not silent.
 */
export const MIN_VERIFIED_FOR_CONFIDENCE = 10;
export const MIN_REVIEWS_FOR_CLOUD = 15;
export const MIN_MONTHS_FOR_TREND = 3;
export const MIN_REVIEWS_PER_MONTH = 3;

export type RatingSummary = {
  n: number;
  avg: number | null;
  positive: number;
  neutral: number;
  negative: number;
  pctPositive: number;
  pctNeutral: number;
  pctNegative: number;
};

export function summarise(reviews: Review[]): RatingSummary {
  const n = reviews.length;
  const positive = reviews.filter((r) => sentimentOf(r.rating) === "positive").length;
  const neutral = reviews.filter((r) => sentimentOf(r.rating) === "neutral").length;
  const negative = reviews.filter((r) => sentimentOf(r.rating) === "negative").length;
  const pct = (x: number) => (n === 0 ? 0 : (x / n) * 100);
  return {
    n,
    avg: n === 0 ? null : reviews.reduce((a, r) => a + r.rating, 0) / n,
    positive,
    neutral,
    negative,
    pctPositive: pct(positive),
    pctNeutral: pct(neutral),
    pctNegative: pct(negative),
  };
}

export type SkuStats = {
  sku: Sku;
  all: RatingSummary;
  verified: RatingSummary;
  insufficient: boolean;
};

export function skuStats(sku: Sku, reviews: Review[]): SkuStats {
  const mine = reviews.filter((r) => r.skuId === sku.id);
  const verified = mine.filter((r) => r.verified);
  return {
    sku,
    all: summarise(mine),
    verified: summarise(verified),
    insufficient: verified.length < MIN_VERIFIED_FOR_CONFIDENCE,
  };
}

export function brandStats(brand: Brand, reviews: Review[]) {
  const mine = reviews.filter((r) => skuById(r.skuId)?.brand === brand);
  const verified = mine.filter((r) => r.verified);
  const skus = skusForBrand(brand)
    .map((s) => skuStats(s, reviews))
    .sort((a, b) => b.all.n - a.all.n);

  // Ranked on verified reviews only, and only where there are enough of them
  // to mean anything — otherwise HydroVac's single 5-star review "wins".
  const rankable = skus.filter((s) => !s.insufficient && s.verified.avg !== null);
  const byAvg = rankable.slice().sort((a, b) => b.verified.avg! - a.verified.avg!);

  return {
    brand,
    all: summarise(mine),
    verified: summarise(verified),
    skus,
    reviews: mine,
    topPerformer: byAvg[0] ?? null,
    needsAttention: byAvg[byAvg.length - 1] ?? null,
    rankedFrom: rankable.length,
  };
}

export function allBrandTotals(reviews: Review[]) {
  return (["Ninja", "Shark"] as Brand[]).map((brand) => {
    const mine = reviews.filter((r) => skuById(r.skuId)?.brand === brand);
    return {
      brand,
      all: summarise(mine),
      verified: summarise(mine.filter((r) => r.verified)),
      skuCount: skusForBrand(brand).length,
    };
  });
}

/* ------------------------------------------------------------- word clouds */

export type CloudResult =
  | { ok: true; words: CloudWord[]; n: number }
  | { ok: false; reason: string; n: number };

export function cloudFor(
  reviews: Review[],
  polarity: "positive" | "negative",
  scope?: Sku | Brand,
): CloudResult {
  const stop =
    typeof scope === "string" ? brandTokensFor(scope) : brandTokens(scope);
  const pool = reviews.filter((r) =>
    polarity === "positive" ? r.rating >= 4 : r.rating <= 2,
  );
  if (pool.length < MIN_REVIEWS_FOR_CLOUD) {
    return {
      ok: false,
      n: pool.length,
      reason:
        pool.length === 0
          ? `No ${polarity} reviews yet.`
          : `Only ${pool.length} ${polarity} review${pool.length === 1 ? "" : "s"} — not enough to read a pattern from (needs ${MIN_REVIEWS_FOR_CLOUD}).`,
    };
  }
  const texts = pool.map((r) => `${r.title}. ${r.body}`);
  return { ok: true, n: pool.length, words: wordCloud(texts, stop) };
}

export function themesFor(
  reviews: Review[],
  polarity: "positive" | "negative",
  scope?: Sku | Brand,
  limit = 5,
): Theme[] {
  const pool = reviews.filter((r) =>
    polarity === "positive" ? r.rating >= 4 : r.rating <= 2,
  );
  return themes(
    pool.map((r) => `${r.title}. ${r.body}`),
    typeof scope === "string" ? brandTokensFor(scope) : brandTokens(scope),
    limit,
  );
}

/* --------------------------------------------------------- problem buckets */

export type BucketRow = {
  bucket: Bucket | "Unclassified";
  count: number;
  pct: number;
  example: string | null;
};

/** One short paraphrase per bucket, for colour. Not a quote. */
const BUCKET_BLURB: Record<Bucket, string> = {
  Product: "Unit failed, underperformed, or didn't match its spec",
  "Delivery / DOA": "Arrived damaged, dented, scratched or visibly used",
  "Customer Service": "Support unreachable, unhelpful, or never followed up",
  "Installation / Demo": "No demo slot, long install queue, no on-site help",
  "Returns / Replacement": "Refund, replacement or pickup refused or stalled",
  Marketplace: "Listing claims, pricing or seller handling disputed",
};

export function bucketTable(reviews: Review[]): {
  rows: BucketRow[];
  negatives: number;
} {
  const negatives = reviews.filter((r) => r.rating <= 2);
  const total = negatives.length;
  const rows: BucketRow[] = BUCKETS.map((bucket) => {
    const count = negatives.filter((r) => r.buckets.includes(bucket)).length;
    return {
      bucket,
      count,
      pct: total === 0 ? 0 : (count / total) * 100,
      example: count > 0 ? BUCKET_BLURB[bucket] : null,
    };
  }).sort((a, b) => b.count - a.count);

  const unclassified = negatives.filter((r) => r.buckets.length === 0).length;
  if (unclassified > 0) {
    rows.push({
      bucket: "Unclassified",
      count: unclassified,
      pct: (unclassified / total) * 100,
      example: "Negative, but names no cause the rules can act on",
    });
  }
  return { rows, negatives: total };
}

/* ------------------------------------------------------------------ trend */

export type TrendPoint = { month: string; label: string; avg: number; n: number };
export type TrendResult =
  | { ok: true; points: TrendPoint[] }
  | { ok: false; reason: string };

const MONTH_LABEL = (ym: string) => {
  const [y, m] = ym.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
};

/** Verified-only monthly average, as briefed. */
export function trend(reviews: Review[]): TrendResult {
  const verified = reviews.filter((r) => r.verified);
  const byMonth = new Map<string, number[]>();
  for (const r of verified) {
    const ym = r.reviewDate.slice(0, 7);
    byMonth.set(ym, [...(byMonth.get(ym) ?? []), r.rating]);
  }
  const points = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, ratings]) => ({
      month,
      label: MONTH_LABEL(month),
      avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      n: ratings.length,
    }));

  const solid = points.filter((p) => p.n >= MIN_REVIEWS_PER_MONTH);
  if (solid.length < MIN_MONTHS_FOR_TREND) {
    return {
      ok: false,
      reason: `Needs ${MIN_MONTHS_FOR_TREND} months with at least ${MIN_REVIEWS_PER_MONTH} verified reviews each; this SKU has ${solid.length}.`,
    };
  }
  return { ok: true, points };
}

export function dateRange(reviews: Review[]) {
  if (reviews.length === 0) return null;
  const sorted = reviews.map((r) => r.reviewDate).sort();
  return { from: sorted[0], to: sorted[sorted.length - 1] };
}

export function reviewsForSku(reviews: Review[], skuId: string) {
  return reviews.filter((r) => r.skuId === skuId);
}

export const ALL_SKUS = SKUS;
