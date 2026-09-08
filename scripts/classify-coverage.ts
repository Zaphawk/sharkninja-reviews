import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";
import { classifyReview } from "../lib/classify";
import { BUCKETS } from "../lib/types";

const neg = process.argv.slice(2)
  .flatMap((f) => parseWorkbook(readFileSync(f)).reviews)
  .filter((r) => r.rating <= 2);

const counts = new Map<string, number>();
const unclassified: typeof neg = [];
for (const r of neg) {
  const b = classifyReview(r);
  if (b.length === 0) unclassified.push(r);
  for (const x of b) counts.set(x, (counts.get(x) ?? 0) + 1);
}
console.log(`negatives=${neg.length}  classified=${neg.length - unclassified.length}  coverage=${(((neg.length - unclassified.length) / neg.length) * 100).toFixed(1)}%`);
for (const b of BUCKETS) {
  const c = counts.get(b) ?? 0;
  console.log(`  ${b.padEnd(24)} ${String(c).padStart(3)}  ${((c / neg.length) * 100).toFixed(0)}%`);
}
console.log(`\nUNCLASSIFIED (${unclassified.length}):`);
for (const r of unclassified) console.log(`  [${r.skuId}] ${r.title}. ${r.body.slice(0, 140)}`);
