import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";
const files = process.argv.slice(2);
for (const f of files) {
  const res = parseWorkbook(readFileSync(f));
  for (const r of res.reviews) if (!r.body) console.log(JSON.stringify(r));
}
