import { createHash } from "node:crypto";
import type { Review } from "@/lib/types";

/**
 * Deterministic fingerprint of the review set for a SKU.
 * When new reviews are imported or ratings shift, the dataHash changes,
 * signaling that an insight was generated from earlier data.
 */
export function skuDataHash(reviews: Review[]): string {
  if (reviews.length === 0) return "empty";
  const hashes = reviews
    .map((r) => r.hash)
    .sort()
    .join("");
  return createHash("sha256").update(hashes).digest("hex").slice(0, 16);
}
