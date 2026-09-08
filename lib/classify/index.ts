import type { Bucket, ParsedReview } from "../types";
import { RULES } from "./keywords";

export type ClassifierInput = { title: string; body: string; rating: number };
export type Classifier = (review: ClassifierInput) => Bucket[];

/**
 * The seam. Everything downstream depends only on this signature, so swapping
 * the keyword pass for an LLM call means writing one new function here — the
 * ingest path, the storage schema and the dashboard do not change.
 */
export const classify: Classifier = (review) => {
  // Title-only reviews are real ("Damaged piece delivered" has no body at all),
  // so always classify title and body together.
  const text = `${review.title} ${review.body}`.toLowerCase();
  const hits: Bucket[] = [];
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(text))) hits.push(rule.bucket);
  }
  return hits;
};

/**
 * Only negatives get problem-area buckets — the brief's table is a breakdown of
 * complaints, not of all reviews.
 */
export function classifyReview(r: ParsedReview): Bucket[] {
  if (r.rating > 2) return [];
  return classify(r);
}
