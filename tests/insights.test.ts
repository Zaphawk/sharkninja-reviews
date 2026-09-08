import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../data/seed.json";
import { getAllInsights, getSkuInsight } from "../lib/insights";
import { skuDataHash } from "../lib/insights/hash";
import { SKUS } from "../lib/skus";
import type { Review } from "../lib/types";

test("insights system", async (t) => {
  const allReviews = seed.reviews as unknown as Review[];

  await t.test("skuDataHash produces stable fingerprints", () => {
    const mine = allReviews.filter((r) => r.skuId === "ninja-blast");
    const hash1 = skuDataHash(mine);
    const hash2 = skuDataHash([...mine].reverse()); // order insensitive because sorted internally
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 16);
    assert.match(hash1, /^[0-9a-f]{16}$/);

    // modifying reviews changes the hash
    const altered = [...mine.slice(0, -1)];
    assert.notEqual(skuDataHash(altered), hash1);
  });

  await t.test("baked insights file exists and contains all 12 SKUs", () => {
    const file = getAllInsights();
    assert.equal(file.insights.length, 12);
    assert.ok(file.model.length > 0);
    assert.ok(file.generatedAt.length > 0);

    const validTones = new Set(["critical", "warning", "watch", "healthy", "unknown"]);
    for (const sku of SKUS) {
      const insight = file.insights.find((i) => i.skuId === sku.id);
      assert.ok(insight, `Missing baked insight for SKU: ${sku.id}`);
      assert.ok(validTones.has(insight.tone), `Invalid tone: ${insight.tone} for ${sku.id}`);
      assert.ok(insight.headline.length > 10, `Headline too short for ${sku.id}`);
      assert.ok(Array.isArray(insight.body) && insight.body.length > 0);
      assert.ok(insight.soWhat.length > 0);
      assert.ok(insight.watch.length > 0);
      assert.ok(Array.isArray(insight.evidence) && insight.evidence.length > 0);
    }
  });

  await t.test("freshness check matches current seed reviews", () => {
    for (const sku of SKUS) {
      const mine = allReviews.filter((r) => r.skuId === sku.id);
      const { insight, isStale, currentHash } = getSkuInsight(sku.id, mine);
      assert.ok(insight);
      assert.equal(isStale, false, `Expected ${sku.id} to be fresh, got currentHash=${currentHash}, insightHash=${insight.dataHash}`);
    }
  });

  await t.test("freshness check flags stale when reviews change", () => {
    const mine = allReviews.filter((r) => r.skuId === "shark-flex-breeze");
    const fakeReview: Review = {
      ...mine[0],
      hash: "00000000000000000000000000000000",
      title: "Brand new review that shifts data",
    };
    const { isStale } = getSkuInsight("shark-flex-breeze", [...mine, fakeReview]);
    assert.equal(isStale, true);
  });
});
