/** Tokenisation and phrase extraction for word clouds and theme lists. */

const STOPWORDS = new Set(
  `a about after again all also am an and any are as at be because been before being
  below between both but by can cannot could did do does doing don dont down during each
  few for from further had has have having he her here hers herself him himself his how
  i if in into is it its itself just me more most my myself no nor not now of off on once
  only or other our ours ourselves out over own same she should so some such than that
  the their theirs them themselves then there these they this those through to too under
  until up very was we were what when where which while who whom why will with would you
  your yours yourself yourselves s t don't didn't doesn't isn't wasn't aren't won't can't
  get got one two three ive im dont doesnt didnt thats theres wont cant able really much
  even still back way lot bit going make made take taken use used using will would
  product item purchase bought buy amazon rs inr price`
    .split(/\s+/)
    .filter(Boolean),
);

/** Words that carry no meaning on their own but do inside a phrase. */
const WEAK = new Set(["not", "no", "very", "too", "good", "bad"]);

export function tokenize(text: string, extraStop: string[] = []): string[] {
  const stop = new Set([...STOPWORDS, ...extraStop.map((s) => s.toLowerCase())]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((w) => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w));
}

export type CloudWord = { text: string; value: number };

/**
 * Unigrams and bigrams sized by frequency. Bigrams are kept because
 * "customer service" and "power cord" are the actual complaints — the
 * unigrams "customer" and "cord" say much less on their own.
 */
export function wordCloud(
  texts: string[],
  extraStop: string[],
  cap = 40,
): CloudWord[] {
  const counts = new Map<string, number>();
  const bump = (k: string, by = 1) => counts.set(k, (counts.get(k) ?? 0) + by);

  for (const t of texts) {
    const words = tokenize(t, extraStop);
    for (const w of words) if (!WEAK.has(w)) bump(w);
    for (let i = 0; i < words.length - 1; i++) {
      // "good good" is a counting artefact, not a phrase.
      if (words[i] === words[i + 1]) continue;
      bump(`${words[i]} ${words[i + 1]}`, 2); // phrases beat loose words
    }
  }

  const entries = [...counts.entries()]
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1]);

  // Drop a unigram if a bigram containing it already ranks higher.
  const kept: [string, number][] = [];
  for (const [word, value] of entries) {
    if (!word.includes(" ")) {
      const covered = kept.some(
        (k) => k[0].includes(" ") && k[0].split(" ").includes(word),
      );
      if (covered) continue;
    }
    kept.push([word, value]);
    if (kept.length >= cap) break;
  }

  return kept.map(([text, value]) => ({ text, value }));
}

export type Theme = { phrase: string; reviews: number };

/**
 * Ranked multi-word phrases, counted by how many distinct reviews contain them
 * (not raw occurrences, so one ranting reviewer can't invent a theme).
 */
export function themes(
  texts: string[],
  extraStop: string[],
  limit = 5,
): Theme[] {
  const docFreq = new Map<string, number>();
  for (const t of texts) {
    const words = tokenize(t, extraStop);
    const seen = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i + 1]) continue;
      seen.add(`${words[i]} ${words[i + 1]}`);
      if (i < words.length - 2 && words[i + 1] !== words[i + 2]) {
        seen.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    for (const p of seen) docFreq.set(p, (docFreq.get(p) ?? 0) + 1);
  }

  const ranked = [...docFreq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);

  // Prefer the longer phrase when a shorter one is contained in it.
  const out: Theme[] = [];
  for (const [phrase, n] of ranked) {
    if (out.some((t) => t.phrase.includes(phrase) || phrase.includes(t.phrase))) {
      continue;
    }
    out.push({ phrase, reviews: n });
    if (out.length >= limit) break;
  }
  return out;
}
