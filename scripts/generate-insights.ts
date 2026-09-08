#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import seed from "../data/seed.json";
import {
  bucketTable,
  direction,
  skuStats,
  themesFor,
  trend,
} from "../lib/aggregate";
import { skuDataHash } from "../lib/insights/hash";
import {
  DEFAULT_OPENROUTER_MODEL,
  generateSkuInsightWithOpenRouter,
} from "../lib/insights/openrouter";
import type { InsightFile, SkuInsight } from "../lib/insights/types";
import { SKUS, skuById } from "../lib/skus";
import type { Review } from "../lib/types";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const args = process.argv.slice(2);
  const skuArgIndex = args.indexOf("--sku");
  const targetSkuId = skuArgIndex !== -1 ? args[skuArgIndex + 1] : null;
  const force = args.includes("--force");

  if (!apiKey) {
    console.error("Error: OPENROUTER_API_KEY environment variable is required.");
    console.error("Usage: OPENROUTER_API_KEY=your_key npx tsx scripts/generate-insights.ts [--sku <id>] [--force]");
    process.exit(1);
  }

  const allReviews = seed.reviews as unknown as Review[];
  const targetSkus = targetSkuId
    ? [skuById(targetSkuId)].filter(Boolean)
    : SKUS;

  if (targetSkus.length === 0) {
    console.error(`Unknown SKU id: ${targetSkuId}`);
    process.exit(1);
  }

  const targetPath = resolve(__dirname, "../data/insights.json");
  let existingFile: InsightFile = {
    generatedAt: new Date().toISOString(),
    model,
    insights: [],
  };

  try {
    const raw = readFileSync(targetPath, "utf-8");
    const existingRaw = JSON.parse(raw);
    if (existingRaw?.insights) {
      existingFile = existingRaw;
    }
  } catch {
    // start fresh
  }

  const updatedInsights: SkuInsight[] = [...existingFile.insights];

  console.log(`Using model: ${model}`);
  console.log(`Processing ${targetSkus.length} SKU(s)...\n`);

  for (const sku of targetSkus) {
    if (!sku) continue;
    const mine = allReviews.filter((r) => r.skuId === sku.id);
    const hash = skuDataHash(mine);
    const existing = updatedInsights.find((i) => i.skuId === sku.id);

    if (existing && existing.dataHash === hash && !force && !targetSkuId) {
      console.log(`[SKIP] ${sku.name} (${sku.id}): dataHash unchanged (${hash})`);
      continue;
    }

    console.log(`[GENERATING] ${sku.name} (${sku.id})...`);
    const stats = skuStats(sku, allReviews);
    const buckets = bucketTable(mine);
    const trendResult = trend(mine);
    const directionResult = direction(mine);
    const negThemes = themesFor(mine, "negative", sku, 6);
    const posThemes = themesFor(mine, "positive", sku, 6);

    try {
      const insight = await generateSkuInsightWithOpenRouter(
        {
          sku,
          reviews: mine,
          stats,
          buckets,
          trendResult,
          directionResult,
          negThemes,
          posThemes,
        },
        { apiKey, model },
      );

      const idx = updatedInsights.findIndex((i) => i.skuId === sku.id);
      if (idx >= 0) {
        updatedInsights[idx] = insight;
      } else {
        updatedInsights.push(insight);
      }
      console.log(`  -> Tone: ${insight.tone.toUpperCase()} | ${insight.headline}\n`);
    } catch (err: unknown) {
      console.error(`  -> Failed for ${sku.id}:`, (err as Error).message);
    }
  }

  const resultFile: InsightFile = {
    generatedAt: new Date().toISOString(),
    model,
    insights: updatedInsights,
  };

  writeFileSync(targetPath, JSON.stringify(resultFile, null, 2), "utf-8");
  console.log(`\nSuccessfully saved insights to: ${targetPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
