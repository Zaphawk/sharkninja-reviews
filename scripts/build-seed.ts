/**
 * Bakes the current export into data/seed.json so a deployment with no
 * DATABASE_URL still shows the real dashboard instead of an empty state.
 * Re-run after a new export if the hosted demo should reflect it:
 *
 *   npx tsx scripts/build-seed.ts ~/Downloads/SharkNinjaBrief/*.xlsx
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseWorkbook } from "../lib/parse/workbook";
import { toReviews } from "../lib/ingest";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: build-seed.ts <workbook.xlsx> [...]");
  process.exit(1);
}

const parsed = files.flatMap((f) => {
  const res = parseWorkbook(readFileSync(f));
  if (res.unmappedSheets.length > 0) {
    console.error(`unmapped sheets in ${f}: ${res.unmappedSheets.join(", ")}`);
    process.exit(1);
  }
  return res.reviews;
});

const reviews = toReviews(parsed);
const unique = new Map(reviews.map((r) => [r.hash, r]));
const out = [...unique.values()].sort((a, b) =>
  b.reviewDate.localeCompare(a.reviewDate),
);

const path = join(process.cwd(), "data", "seed.json");
writeFileSync(
  path,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sources: files.map((f) => f.split("/").pop()),
      reviews: out,
    },
    null,
    0,
  ),
);
console.log(`${out.length} reviews -> data/seed.json (${files.length} files, ${reviews.length - out.length} duplicates collapsed)`);
