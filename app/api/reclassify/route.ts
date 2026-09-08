import { NextResponse } from "next/server";
import { classifyReview } from "@/lib/classify";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Re-runs the classifier over everything already stored. This is what makes
 * the keyword list safe to tune — and what an LLM classifier would be wired
 * into, without re-importing a single file.
 */
export async function POST() {
  const store = getStore();
  await store.init();
  const reviews = await store.allReviews();

  const updates = reviews
    .map((r) => ({ hash: r.hash, buckets: classifyReview(r) }))
    .filter((u, i) => {
      const before = reviews[i].buckets.slice().sort().join("|");
      return before !== u.buckets.slice().sort().join("|");
    });

  const changed = await store.setBuckets(updates);
  return NextResponse.json({ ok: true, reviews: reviews.length, changed });
}
