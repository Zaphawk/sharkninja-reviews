import bakedData from "@/data/insights.json";
import type { Review } from "@/lib/types";
import { skuDataHash } from "./hash";
import type { InsightFile, SkuInsight } from "./types";

const bakedFile = bakedData as unknown as InsightFile;

/**
 * Returns the entire baked insight file.
 */
export function getAllInsights(): InsightFile {
  return bakedFile;
}

/**
 * Retrieves the insight for a given SKU ID and compares its dataHash
 * against the current reviews to detect if the data has evolved.
 */
export function getSkuInsight(
  skuId: string,
  currentReviews?: Review[],
): {
  insight: SkuInsight | null;
  isStale: boolean;
  currentHash: string | null;
} {
  const insight = bakedFile.insights.find((i) => i.skuId === skuId) ?? null;
  if (!insight) {
    return { insight: null, isStale: false, currentHash: null };
  }

  if (!currentReviews) {
    return { insight, isStale: false, currentHash: insight.dataHash };
  }

  const currentHash = skuDataHash(currentReviews);
  const isStale = insight.dataHash !== currentHash;

  return {
    insight,
    isStale,
    currentHash,
  };
}
