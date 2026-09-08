import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";
const files = process.argv.slice(2);
const neg = files.flatMap((f) => parseWorkbook(readFileSync(f)).reviews).filter((r) => r.rating <= 2);
console.log(`N=${neg.length}`);
neg.forEach((r, i) => {
  const text = `${r.title}. ${r.body}`.replace(/\s+/g, " ").trim();
  console.log(`${i + 1}|${r.skuId.replace(/^(ninja|shark)-/, "")}|${r.rating}| ${text.slice(0, 300)}`);
});
