import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";
import { validate, warningLabel } from "../lib/validate";
for (const f of process.argv.slice(2)) {
  const rs = parseWorkbook(readFileSync(f)).reviews;
  const ws = validate(rs, 0);
  console.log(`\n${f.split("/").pop()} — ${ws.length} warnings`);
  for (const w of ws) console.log("  •", warningLabel(w).slice(0, 150));
}
