import type { ParsedReview } from "../types";

/**
 * Amazon.in reviews are pasted into the workbook as one long single column per
 * SKU sheet. There are no headers and no columns. A record looks like:
 *
 *   Surendhran S                                    <- reviewer
 *   1.0 out of 5 stars Lack of Onsite Assistance   <- rating + title (NBSP!)
 *   Reviewed in India on 14 July 2026                <- date + country
 *   Colour: Sea Salt GreyVerified Purchase           <- variant + verified flag
 *   I purchased this air fryer during ...            <- body, 1..n rows
 *   Helpful
 *   Report
 *
 * Rows in between vary: media rows, helpfulness counts, and multi-row bodies
 * all appear. So the rating line is the only reliable record boundary — we
 * anchor on it and read outwards.
 */

const RATING = /^([1-5])(?:\.0)? out of 5 stars[\s ]*(.*)$/;
const REVIEWED_ON = /^Reviewed in ([A-Za-z ]+?) on (\d{1,2} [A-Za-z]+ \d{4})/;
const VERIFIED = /Verified Purchase/;
const VARIANT_PREFIX = /^(Colour|Color|Size|Style|Pattern|Capacity|Configuration|Item Package Quantity)\s*:/i;

/** Rows that are Amazon chrome, not review content. */
const NOISE = [
  /^Helpful$/i,
  /^Report$/i,
  /^Report abuse$/i,
  /^Click to play video$/i,
  /^Customer image(Customer image)*$/i,
  /^Customer video$/i,
  /^(One person|\d[\d,]*\s+people) found this helpful$/i,
  /^\d[\d,]*\s+persons? found this helpful$/i,
  /^From [A-Za-z ]+$/,
  /^Top review(s)? from [A-Za-z ]+$/i,
  /^See more reviews$/i,
  /^Translate review to English$/i,
  /^Read more$/i,
  /^VINE VOICE$/i,
];

const isNoise = (line: string) => NOISE.some((re) => re.test(line.trim()));

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

/** "14 July 2026" -> "2026-07-14". Returns null on anything unexpected. */
export function parseReviewDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

/**
 * Parse one SKU sheet's worth of lines into reviews.
 * `lines` is the sheet in row order, each row already flattened to a string.
 */
export function parseSheet(skuId: string, lines: string[]): ParsedReview[] {
  const rows = lines.map((l) => (l ?? "").trim());
  const out: ParsedReview[] = [];

  // Every index where a new review starts.
  const starts: number[] = [];
  rows.forEach((r, i) => {
    if (RATING.test(r)) starts.push(i);
  });

  for (let s = 0; s < starts.length; s++) {
    const i = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : rows.length;
    const m = rows[i].match(RATING)!;
    const rating = Number(m[1]);
    const title = m[2].replace(/ /g, " ").trim();

    // Reviewer is the nearest line above that isn't chrome or part of the
    // previous review's tail. Stop at the previous record's start.
    const floor = s > 0 ? starts[s - 1] : -1;
    let reviewer = "";
    for (let j = i - 1; j > floor; j--) {
      const r = rows[j];
      if (!r || isNoise(r) || REVIEWED_ON.test(r) || VERIFIED.test(r)) continue;
      reviewer = r;
      break;
    }

    let reviewDate: string | null = null;
    let country = "";
    let verified = false;
    let variant: string | null = null;
    const bodyParts: string[] = [];

    for (let j = i + 1; j < end; j++) {
      const r = rows[j];
      if (!r) continue;

      const dm = r.match(REVIEWED_ON);
      if (dm) {
        country = dm[1].trim();
        reviewDate = parseReviewDate(dm[2]);
        continue;
      }

      if (VERIFIED.test(r)) {
        // "Colour: Sea Salt GreyVerified Purchase" — the flag is glued to the
        // variant string, so strip it off rather than treating it as a column.
        verified = true;
        const rest = r.replace(VERIFIED, "").trim();
        if (rest && VARIANT_PREFIX.test(rest)) variant = rest;
        continue;
      }

      if (VARIANT_PREFIX.test(r)) {
        variant = r;
        continue;
      }

      if (isNoise(r)) continue;

      bodyParts.push(r);
    }

    // The line directly before the NEXT record is that record's reviewer name,
    // not this record's body. Drop it.
    if (s + 1 < starts.length && bodyParts.length > 0) {
      const nextFloor = starts[s + 1];
      let nextReviewerRow = -1;
      for (let j = nextFloor - 1; j > i; j--) {
        const r = rows[j];
        if (!r || isNoise(r) || REVIEWED_ON.test(r) || VERIFIED.test(r)) continue;
        nextReviewerRow = j;
        break;
      }
      if (nextReviewerRow !== -1) {
        const claimed = rows[nextReviewerRow];
        const last = bodyParts[bodyParts.length - 1];
        if (last === claimed) bodyParts.pop();
      }
    }

    if (!reviewDate) continue; // a record with no date is not a review

    out.push({
      skuId,
      reviewer: reviewer || "Amazon Customer",
      rating,
      title,
      body: bodyParts.join(" ").replace(/\s+/g, " ").trim(),
      reviewDate,
      verified,
      country: country || "Unknown",
      variant,
    });
  }

  return out;
}

export const __testing = { RATING, isNoise, REVIEWED_ON };
