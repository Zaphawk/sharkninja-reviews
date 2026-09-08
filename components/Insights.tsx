import type { BucketRow } from "@/lib/aggregate";
import type { Theme } from "@/lib/text";

export function ThemeList({
  themes,
  tone,
}: {
  themes: Theme[];
  tone: "positive" | "negative";
}) {
  if (themes.length === 0) return null;
  return (
    <ul className="mt-4 space-y-1.5 border-t border-silver-light pt-4">
      {themes.map((t) => (
        <li
          key={t.phrase}
          className="flex items-baseline justify-between gap-3 text-[13px]"
        >
          <span className="capitalize">
            <span
              className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                tone === "positive" ? "bg-teal" : "bg-[#c8322b]"
              }`}
            />
            {t.phrase}
          </span>
          <span className="tabular shrink-0 text-[12px] text-ink-60">
            {t.reviews} reviews
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The problem-area breakdown. Bars rather than a bare table because the shape
 * of the complaint mix is the finding — which area dominates, and by how much.
 */
export function BucketBars({
  rows,
  total,
}: {
  rows: BucketRow[];
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="text-[13px] text-ink-60">
        No negative reviews here — nothing to break down.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.bucket}>
          <div className="grid grid-cols-[minmax(0,10.5rem)_1fr_auto] items-center gap-3">
            <span className="truncate text-[13px] font-semibold">{r.bucket}</span>
            <div className="h-5 rounded bg-silver-bg">
              <div
                className={`h-5 rounded ${
                  r.bucket === "Unclassified" ? "bg-silver" : "bg-teal"
                }`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="tabular w-24 shrink-0 text-right text-[12px] text-ink-60">
              {r.count} · {r.pct.toFixed(0)}%
            </span>
          </div>
          {r.example ? (
            <p className="mt-1 pl-[calc(10.5rem+0.75rem)] text-[12px] text-ink-60">
              {r.example}
            </p>
          ) : null}
        </div>
      ))}
      <p className="pt-1 text-[12px] text-ink-60">
        Percentages are of all {total} negative reviews and sum above 100%,
        because one review can name several problems.
      </p>
    </div>
  );
}
