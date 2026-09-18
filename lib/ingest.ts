import { randomUUID } from "node:crypto";
import { classifyReview } from "./classify";
import { reviewHash } from "./hash";
import { parseSheet } from "./parse/records";
import { parseWorkbook } from "./parse/workbook";
import { skuById } from "./skus";
import { getStore } from "./store";
import type { IngestReport, ParsedReview, Review, SkippedRow } from "./types";
import { validate } from "./validate";

export function toReviews(parsed: ParsedReview[]): Review[] {
  return parsed.map((r) => ({
    ...r,
    hash: reviewHash(r),
    buckets: classifyReview(r),
  }));
}

/**
 * A tab that matches no SKU means those reviews vanish. Raised before anything
 * is written, so the message the caller shows ("nothing was imported") is true:
 * the previous version inserted the good sheets first and then reported the
 * import as refused.
 */
export class UnmappedSheetsError extends Error {
  constructor(
    readonly sheets: string[],
    readonly filename: string,
  ) {
    super(
      `Unrecognised sheet${sheets.length > 1 ? "s" : ""} in ${filename}: ${sheets.join(", ")}. Nothing was imported. Either use the model template, or add the tab name to that SKU's sheetNames in lib/skus.ts.`,
    );
    this.name = "UnmappedSheetsError";
  }
}

export class EmptyImportError extends Error {
  constructor(message = "No reviews could be recognized in the pasted text.") {
    super(message);
    this.name = "EmptyImportError";
  }
}

export class InvalidSkuError extends Error {
  constructor(skuId: string) {
    super(`Unknown SKU: ${skuId}`);
    this.name = "InvalidSkuError";
  }
}

async function commitParsedReviews({
  parsedReviews,
  rowsRead,
  sheetsRead,
  filename,
  unmappedSheets = [],
  skippedRows = [],
}: {
  parsedReviews: ParsedReview[];
  rowsRead: number;
  sheetsRead: number;
  filename: string;
  unmappedSheets?: string[];
  skippedRows?: SkippedRow[];
}): Promise<IngestReport> {
  const reviews = toReviews(parsedReviews);

  // Collapse duplicates inside a single batch before touching the store
  const unique = new Map<string, Review>();
  for (const r of reviews) if (!unique.has(r.hash)) unique.set(r.hash, r);
  const deduped = [...unique.values()];
  const withinFileDuplicates = reviews.length - deduped.length;

  const store = getStore();
  await store.init();

  // Read what is already there first, so the per-SKU column can say how many
  // are genuinely new rather than how many were unique within the file.
  const existing = new Set((await store.allReviews()).map((r) => r.hash));

  const importId = randomUUID();
  const { inserted, duplicates } = await store.insertReviews(deduped, importId);

  const perSku = perSkuRows(parsedReviews, deduped, existing);
  const dates = deduped.map((r) => r.reviewDate).sort();

  const report: IngestReport = {
    filename,
    sheetsRead,
    rowsRead,
    parsed: reviews.length,
    inserted,
    duplicates: duplicates + withinFileDuplicates,
    unmappedSheets,
    skippedRows,
    perSku,
    dateRange:
      dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
    warnings: validate(deduped, withinFileDuplicates, skippedRows),
  };

  await store.recordImport({
    id: importId,
    filename,
    createdAt: new Date().toISOString(),
    report,
  });

  return report;
}

/**
 * One path in for binary workbooks or CSV files.
 */
export async function ingestBuffer(
  buf: Buffer,
  filename: string,
): Promise<IngestReport> {
  const parsedWb = parseWorkbook(buf);

  // Checked before the store is touched: a refused import must leave nothing behind.
  if (parsedWb.unmappedSheets.length > 0) {
    throw new UnmappedSheetsError(parsedWb.unmappedSheets, filename);
  }

  return commitParsedReviews({
    parsedReviews: parsedWb.reviews,
    rowsRead: parsedWb.rowsRead,
    sheetsRead: parsedWb.sheets.length,
    filename,
    unmappedSheets: parsedWb.unmappedSheets,
    skippedRows: parsedWb.skippedRows,
  });
}

/**
 * Ingest raw review text pasted directly from Amazon for a chosen SKU.
 */
export async function ingestText(
  skuId: string,
  text: string,
  filename = "Pasted reviews",
): Promise<IngestReport> {
  if (!skuById(skuId)) {
    throw new InvalidSkuError(skuId);
  }

  const lines = text.split(/\r?\n/);
  const parsed = parseSheet(skuId, lines);

  if (parsed.length === 0) {
    throw new EmptyImportError();
  }

  return commitParsedReviews({
    parsedReviews: parsed,
    rowsRead: lines.length,
    sheetsRead: 1,
    filename,
  });
}

/**
 * Grouped by SKU rather than by sheet. The template puts every SKU in one
 * sheet, so reading the SKU off the first row of each sheet — which is what
 * this used to do — collapsed twelve products into one.
 */
function perSkuRows(
  parsed: ParsedReview[],
  deduped: Review[],
  existing: Set<string>,
): IngestReport["perSku"] {
  const rows = new Map<string, { parsed: number; inserted: number }>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { parsed: 0, inserted: 0 }));
    return r;
  };

  for (const r of parsed) row(r.skuId).parsed++;
  for (const r of deduped) if (!existing.has(r.hash)) row(r.skuId).inserted++;

  return [...rows.entries()]
    .map(([skuId, counts]) => ({
      skuId,
      name: skuById(skuId)?.name ?? skuId,
      ...counts,
    }))
    .sort((a, b) => b.inserted - a.inserted || a.name.localeCompare(b.name));
}
