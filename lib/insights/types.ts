/**
 * How worried a reader should be, in one word. Drives the colour of the
 * insight card and nothing else — the prose has to earn the claim on its own.
 */
export type InsightTone = "critical" | "warning" | "watch" | "healthy" | "unknown";

export type SkuInsight = {
  skuId: string;
  tone: InsightTone;
  /** One sentence. The finding, not a description of the chart. */
  headline: string;
  /** The reasoning, in two or three short paragraphs. */
  body: string[];
  /** The commercial consequence — the "so what" a CI deck would carry. */
  soWhat: string;
  /** What to do or watch next. */
  watch: string;
  /** Numbers pulled straight from the data, so a claim can be checked. */
  evidence: string[];
  /**
   * Fingerprint of the reviews this was written from. When the data moves on,
   * the card says so rather than quietly presenting a stale reading as current.
   */
  dataHash: string;
  generatedAt: string;
  model: string;
};

export type InsightFile = {
  generatedAt: string;
  model: string;
  insights: SkuInsight[];
};
