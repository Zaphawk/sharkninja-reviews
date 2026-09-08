import { readFileSync } from "node:fs";
import { parseWorkbook } from "../lib/parse/workbook";

const files = process.argv.slice(2);
let total = 0;
const all: ReturnType<typeof parseWorkbook>["reviews"] = [];

for (const f of files) {
  const res = parseWorkbook(readFileSync(f));
  console.log(`\n=== ${f.split("/").pop()}`);
  console.log(`rows=${res.rowsRead} unmapped=${JSON.stringify(res.unmappedSheets)}`);
  for (const s of res.sheets) {
    const r = s.reviews;
    const neg = r.filter((x) => x.rating <= 2).length;
    const ver = r.filter((x) => x.verified).length;
    const noBody = r.filter((x) => !x.body).length;
    const countries = [...new Set(r.map((x) => x.country))].join(",");
    console.log(
      `  ${s.sheetName.padEnd(24)} n=${String(r.length).padStart(3)} verified=${String(ver).padStart(3)} neg=${String(neg).padStart(3)} emptyBody=${noBody} countries=${countries}`,
    );
  }
  total += res.reviews.length;
  all.push(...res.reviews);
}

const dates = all.map((r) => r.reviewDate).sort();
console.log(`\nTOTAL ${total} reviews | date range ${dates[0]} .. ${dates[dates.length - 1]}`);
console.log(`unique skus: ${new Set(all.map((r) => r.skuId)).size}`);

const combi = all.filter((r) => r.skuId === "ninja-combi");
const spot = combi.find((r) => r.reviewer === "Surendhran S");
console.log("\nSPOT CHECK (Combi, Surendhran S):");
console.log(JSON.stringify(spot, null, 2));
const multi = all.filter((r) => r.body.length > 400);
console.log(`\nlong bodies (>400 chars): ${multi.length}`);
console.log("longest:", JSON.stringify(all.slice().sort((a,b)=>b.body.length-a.body.length)[0]?.body.slice(0,300)));
