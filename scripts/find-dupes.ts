import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";
import { reviewHash } from "../lib/hash";

for (const f of process.argv.slice(2)) {
  const rs = parseWorkbook(readFileSync(f)).reviews;
  const byHash = new Map<string, typeof rs>();
  for (const r of rs) byHash.set(reviewHash(r), [...(byHash.get(reviewHash(r)) ?? []), r]);
  for (const [h, group] of byHash) {
    if (group.length > 1) {
      console.log(`\n${f.split("/").pop()} — ${group.length} copies (${h.slice(0, 8)})`);
      for (const g of group) {
        console.log(`   [${g.skuId}] ${g.rating}★ "${g.title}" — ${g.reviewer}, ${g.reviewDate}`);
      }
    }
  }
}
