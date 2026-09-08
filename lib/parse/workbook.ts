import * as XLSX from "xlsx";
import { skuForSheet, SKUS } from "../skus";
import type { ParsedReview } from "../types";
import { parseSheet } from "./records";

export type SheetResult = {
  sheetName: string;
  skuId: string | null;
  rows: number;
  reviews: ParsedReview[];
};

export type WorkbookResult = {
  sheets: SheetResult[];
  unmappedSheets: string[];
  reviews: ParsedReview[];
  rowsRead: number;
};

/** Index sheets carry the product list, not reviews. */
const INDEX_SHEETS = /^(sheet1|index|products?|links?)$/i;

/** Flatten one worksheet into row-ordered strings (all columns joined). */
function sheetToLines(ws: XLSX.WorkSheet): string[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: false,
  });
  return rows.map((r) =>
    (Array.isArray(r) ? r : [])
      .map((c) => (c == null ? "" : String(c)))
      .join(" ")
      .replace(/ /g, " ")
      .trim(),
  );
}

/**
 * Reads a workbook laid out as one sheet per SKU of raw pasted Amazon blocks.
 * If a sheet has proper headers (Product/Rating/ReviewText...), it is read as a
 * table instead — that's the shape a future scraper export will have.
 */
export function parseWorkbook(buf: ArrayBuffer | Buffer): WorkbookResult {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const sheets: SheetResult[] = [];
  const unmapped: string[] = [];
  let rowsRead = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    if (INDEX_SHEETS.test(sheetName.trim())) continue;

    const tabular = tryParseTabular(ws);
    if (tabular) {
      rowsRead += tabular.rows;
      sheets.push({ sheetName, skuId: null, rows: tabular.rows, reviews: tabular.reviews });
      continue;
    }

    const sku = skuForSheet(sheetName);
    const lines = sheetToLines(ws);
    rowsRead += lines.length;

    if (!sku) {
      unmapped.push(sheetName);
      continue;
    }

    sheets.push({
      sheetName,
      skuId: sku.id,
      rows: lines.length,
      reviews: parseSheet(sku.id, lines),
    });
  }

  return {
    sheets,
    unmappedSheets: unmapped,
    reviews: sheets.flatMap((s) => s.reviews),
    rowsRead,
  };
}

/**
 * The forward-compatible path: a proper table with named columns, which is what
 * the Apify actor's export looks like. Returns null if this sheet isn't one.
 */
function tryParseTabular(
  ws: XLSX.WorkSheet,
): { rows: number; reviews: ParsedReview[] } | null {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  if (json.length === 0) return null;

  const keys = Object.keys(json[0]).map((k) => k.trim().toLowerCase());
  const has = (n: string) => keys.includes(n);
  if (!(has("rating") && (has("reviewtext") || has("body") || has("text")))) {
    return null;
  }

  const pick = (row: Record<string, unknown>, names: string[]): string => {
    for (const [k, v] of Object.entries(row)) {
      if (names.includes(k.trim().toLowerCase())) return v == null ? "" : String(v);
    }
    return "";
  };

  const reviews: ParsedReview[] = [];
  for (const row of json) {
    const productName = pick(row, ["product", "productname", "sku", "title_product"]);
    const sku =
      SKUS.find((s) => s.name.toLowerCase() === productName.trim().toLowerCase()) ??
      SKUS.find((s) => s.asin.toLowerCase() === pick(row, ["asin"]).trim().toLowerCase());
    if (!sku) continue;

    const rating = Number(pick(row, ["rating", "stars", "score"]));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue;

    const rawDate = pick(row, ["reviewdate", "date"]);
    const iso = normaliseDate(rawDate);
    if (!iso) continue;

    const verifiedRaw = pick(row, ["verified", "verifiedpurchase", "isverified"]).toLowerCase();

    reviews.push({
      skuId: sku.id,
      reviewer: pick(row, ["reviewer", "author", "name", "username"]) || "Amazon Customer",
      rating: Math.round(rating),
      title: pick(row, ["title", "reviewtitle", "headline"]),
      body: pick(row, ["reviewtext", "body", "text", "content"]).replace(/\s+/g, " ").trim(),
      reviewDate: iso,
      verified: ["true", "yes", "1", "verified purchase"].includes(verifiedRaw),
      country: pick(row, ["country", "countryofreview"]) || "India",
      variant: pick(row, ["variant", "colour", "color"]) || null,
    });
  }

  return { rows: json.length, reviews };
}

function normaliseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
