import bakedData from "@/data/insights.json";
import type { Review } from "@/lib/types";
import { skuDataHash } from "./hash";
import type { InsightFile, InsightTone, SkuInsight } from "./types";

const bakedFile = bakedData as unknown as InsightFile;

/**
 * Dynamically computes commercial tone based on real review metrics.
 * Rule: Any SKU below 4.00 (verified or overall) cannot be a healthy performer.
 *
 * Hierarchy:
 * - unknown: < 5 verified reviews (insufficient evidence)
 * - critical: verified or overall avg < 3.40, OR negative rate >= 35%
 * - warning: verified or overall avg < 3.80, OR negative rate >= 20%
 * - watch: < 10 verified reviews, OR verified or overall avg < 4.00, OR negative rate >= 12%
 * - healthy: >= 10 verified reviews AND verified avg >= 4.00 AND overall avg >= 4.00 AND negative rate < 12%
 */
export function deriveTone(reviews: Review[]): InsightTone {
  const verified = reviews.filter((r) => r.verified);
  const n = verified.length;
  if (n < 5) return "unknown";
  if (n < 10) return "watch";

  const vAvg = verified.reduce((acc, r) => acc + r.rating, 0) / n;
  const allAvg = reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1);
  const negCount = reviews.filter((r) => r.rating <= 2).length;
  const pctNegative = (negCount / (reviews.length || 1)) * 100;

  if (vAvg < 3.4 || allAvg < 3.4 || pctNegative >= 35) return "critical";
  if (vAvg < 3.8 || allAvg < 3.8 || pctNegative >= 20) return "warning";
  if (vAvg < 4.0 || allAvg < 4.0 || pctNegative >= 12) return "watch";
  return "healthy";
}

/**
 * Returns the entire baked insight file.
 */
export function getAllInsights(): InsightFile {
  return bakedFile;
}

/**
 * Retrieves the insight for a given SKU ID and compares its dataHash
 * against the current reviews to detect if the data has evolved.
 * Dynamically updates tone so it always reflects live review statistics.
 */
export function getSkuInsight(
  skuId: string,
  currentReviews?: Review[],
): {
  insight: SkuInsight | null;
  isStale: boolean;
  currentHash: string | null;
} {
  const raw = bakedFile.insights.find((i) => i.skuId === skuId) ?? null;
  if (!raw) {
    return { insight: null, isStale: false, currentHash: null };
  }

  if (!currentReviews) {
    return { insight: raw, isStale: false, currentHash: raw.dataHash };
  }

  const currentHash = skuDataHash(currentReviews);
  const isStale = raw.dataHash !== currentHash;
  const liveTone = deriveTone(currentReviews);

  return {
    insight: {
      ...raw,
      tone: liveTone,
    },
    isStale,
    currentHash,
  };
}
