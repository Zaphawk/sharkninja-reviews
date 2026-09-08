import type { RatingSummary } from "@/lib/aggregate";

export function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-60">—</span>;
  return (
    <span className="tabular font-semibold">
      {value.toFixed(2)}
      <span className="ml-0.5 text-[0.75em] font-normal text-ink-60">/5</span>
    </span>
  );
}

/** Positive / neutral / negative as one 100%-wide bar. */
export function SentimentBar({ s }: { s: RatingSummary }) {
  if (s.n === 0) {
    return <div className="h-2 rounded-full bg-silver-light" />;
  }
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-silver-light">
      <div style={{ width: `${s.pctPositive}%` }} className="bg-teal" />
      <div style={{ width: `${s.pctNeutral}%` }} className="bg-silver" />
      <div style={{ width: `${s.pctNegative}%` }} className="bg-[#c8322b]" />
    </div>
  );
}

export function SentimentLegend({ s }: { s: RatingSummary }) {
  return (
    <div className="flex gap-4 text-[12px] text-ink-60">
      <span>
        <b className="tabular text-ink">{s.pctPositive.toFixed(0)}%</b> positive
      </span>
      <span>
        <b className="tabular text-ink">{s.pctNeutral.toFixed(0)}%</b> neutral
      </span>
      <span>
        <b className="tabular text-ink">{s.pctNegative.toFixed(0)}%</b> negative
      </span>
    </div>
  );
}

/**
 * The verified-vs-all comparison the brief calls a required element. Shown as
 * two panels side by side so the gap between them is the point.
 */
export function RatingComparison({
  verified,
  all,
}: {
  verified: RatingSummary;
  all: RatingSummary;
}) {
  const panels: { label: string; note: string; s: RatingSummary; lead: boolean }[] = [
    { label: "Verified purchases", note: "the number to trust", s: verified, lead: true },
    { label: "All reviews", note: "includes unverified", s: all, lead: false },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {panels.map((p) => (
        <div
          key={p.label}
          className={`rounded-lg border bg-white p-5 ${
            p.lead ? "border-teal" : "border-silver-light"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-60">
              {p.label}
            </span>
            <span className="tabular text-[12px] text-ink-60">n={p.s.n}</span>
          </div>
          <div className="mt-2 text-3xl">
            <Stars value={p.s.avg} />
          </div>
          <p className="mt-0.5 text-[12px] text-ink-60">{p.note}</p>
          <div className="mt-4">
            <SentimentBar s={p.s} />
          </div>
          <div className="mt-2">
            <SentimentLegend s={p.s} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsufficientBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e3] px-2.5 py-1 text-[11px] font-semibold text-[#8a5a00]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#c98a00]" />
      Insufficient data — {n} verified review{n === 1 ? "" : "s"}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-silver-light bg-white p-5 ${className}`}
    >
      <h2 className="text-[13px] font-bold uppercase tracking-wide">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[12px] text-ink-60">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function NotEnough({ reason }: { reason: string }) {
  return (
    <div className="rounded-md border border-dashed border-silver bg-silver-bg px-4 py-6 text-center text-[13px] text-ink-60">
      {reason}
    </div>
  );
}
