import { randomUUID } from "node:crypto";
import { classifyReview } from "./classify";
import { reviewHash } from "./hash";
import { parseWorkbook } from "./parse/workbook";
import { skuById } from "./skus";
import { getStore } from "./store";
import type { IngestReport, ParsedReview, Review } from "./types";
import { validate } from "./validate";

export function toReviews(parsed: ParsedReview[]): Review[] {
  return parsed.map((r) => ({
    ...r,
    hash: reviewHash(r),
    buckets: classifyReview(r),
  }));
}

/**
 * One path in, whether the bytes came from someone dragging a file onto the
 * upload page or from a scheduled scraper POSTing a workbook. Parse, hash,
 * classify, insert, report.
 */
export async function ingestBuffer(
  buf: Buffer,
  filename: string,
): Promise<IngestReport> {
  const store = getStore();
  await store.init();

  const parsedWb = parseWorkbook(buf);
  const reviews = toReviews(parsedWb.reviews);

  // Collapse duplicates inside a single file before touching the store: the
  // September export has blocks pasted twice inside the Steam & Scrub sheet.
  const unique = new Map<string, Review>();
  for (const r of reviews) if (!unique.has(r.hash)) unique.set(r.hash, r);
  const deduped = [...unique.values()];
  const withinFileDuplicates = reviews.length - deduped.length;

  const importId = randomUUID();
  const { inserted, duplicates } = await store.insertReviews(deduped, importId);

  const perSku = parsedWb.sheets
    .filter((s) => s.reviews.length > 0)
    .map((s) => {
      const skuId = s.reviews[0].skuId;
      const hashes = new Set(
        s.reviews.map((r) => reviewHash(r)),
      );
      return {
        skuId,
        name: skuById(skuId)?.name ?? skuId,
        parsed: s.reviews.length,
        inserted: deduped.filter((d) => hashes.has(d.hash)).length,
      };
    });

  const dates = deduped.map((r) => r.reviewDate).sort();

  const report: IngestReport = {
    filename,
    sheetsRead: parsedWb.sheets.length,
    rowsRead: parsedWb.rowsRead,
    parsed: reviews.length,
    inserted,
    duplicates: duplicates + withinFileDuplicates,
    unmappedSheets: parsedWb.unmappedSheets,
    perSku,
    dateRange:
      dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
    warnings: validate(deduped, withinFileDuplicates),
  };

  await store.recordImport({
    id: importId,
    filename,
    createdAt: new Date().toISOString(),
    report,
  });

  return report;
}
