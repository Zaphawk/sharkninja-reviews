import type { ParsedReview, Warning } from "./types";
import { skuById } from "./skus";

/** Data-entry noise seen in real exports. */
const PLACEHOLDER_NAMES = /^(placeholder|test|xxx|na|n\/a|-+|reviewer)$/i;

/**
 * A reviewer field holding a whole sentence means a line from somewhere else
 * was pasted where the name belongs — the September export has exactly this,
 * a speaker review's text sitting above a steam mop review.
 */
function looksLikeProse(name: string): boolean {
  const n = name.trim();
  if (PLACEHOLDER_NAMES.test(n)) return true;
  if (n.length > 45) return true;
  // A full stop followed by a lower-case word is mid-sentence. Initials
  // ("K. Agarwal", "Dr T.N. Manohara") are followed by a capital, so they pass.
  if (/[.!?]\s+[a-z]/.test(n)) return true;
  return n.split(/\s+/).length > 6;
}

export function validate(
  reviews: ParsedReview[],
  duplicateHashes: number,
): Warning[] {
  const warnings: Warning[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const r of reviews) {
    if (looksLikeProse(r.reviewer)) {
      warnings.push({
        kind: "suspicious-reviewer",
        skuId: r.skuId,
        detail: `"${r.title}" (${r.reviewDate}) has "${truncate(r.reviewer)}" as the reviewer name — check that row in the sheet.`,
      });
    }
    if (!r.title && !r.body) {
      warnings.push({
        kind: "empty-review",
        skuId: r.skuId,
        detail: `A ${r.rating}-star review dated ${r.reviewDate} has neither title nor text.`,
      });
    }
    if (r.reviewDate > today) {
      warnings.push({
        kind: "future-date",
        skuId: r.skuId,
        detail: `"${r.title}" is dated ${r.reviewDate}, which is in the future.`,
      });
    }
  }

  if (duplicateHashes > 0) {
    warnings.push({
      kind: "duplicate-in-file",
      skuId: "",
      detail: `${duplicateHashes} review${duplicateHashes === 1 ? " was" : "s were"} pasted more than once inside this file. Counted once.`,
    });
  }

  return warnings;
}

export function warningLabel(w: Warning): string {
  const sku = w.skuId ? (skuById(w.skuId)?.name ?? w.skuId) : "This file";
  return `${sku}: ${w.detail}`;
}

const truncate = (s: string) => (s.length > 60 ? `${s.slice(0, 60)}...` : s);
