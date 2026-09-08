import { createHash } from "node:crypto";
import type { ParsedReview } from "./types";

/**
 * Identity of a review, so re-importing an overlapping monthly export is a
 * no-op instead of a double count. The September file and the October file
 * will share most of their rows.
 *
 * Body is truncated because a re-paste can pick up trailing whitespace or an
 * extra media row; the first 200 characters are stable.
 */
export function reviewHash(r: ParsedReview): string {
  const key = [
    r.skuId,
    r.reviewer.trim().toLowerCase(),
    r.reviewDate,
    r.title.trim().toLowerCase(),
    r.body.slice(0, 200).trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}
