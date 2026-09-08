# SharkNinja India — Amazon Review Sentiment

A dashboard for reading Amazon.in customer review sentiment across SharkNinja
India's Ninja and Shark listings: brand → brand overview → single SKU.

Amazon blocks automated collection, so reviews are currently pasted into a
workbook by hand each month. You refresh the dashboard by dragging that
workbook onto the **Import data** page — no terminal, no redeploy.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in APP_PASSWORD and AUTH_SECRET
npm run dev
```

Open http://localhost:3000, sign in with `APP_PASSWORD`, and import a workbook.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment

| Variable | Required | What it does |
|---|---|---|
| `APP_PASSWORD` | yes | The shared team password on the sign-in page |
| `AUTH_SECRET` | yes | Signs the session cookie. Any long random string |
| `DATABASE_URL` | in production | Postgres (Neon). Without it, data goes to `.data/store.json` (fine locally, wiped on every deploy) |
| `INGEST_TOKEN` | no | Shared secret a future scraper sends as `x-ingest-token` to `POST /api/ingest` |
| `OPENROUTER_API_KEY` | for AI generation | Key used by `npm run insights:generate` to synthesize executive insights |
| `OPENROUTER_MODEL` | no | OpenRouter model override (defaults to `anthropic/claude-3.5-sonnet`) |

## Refreshing the data

1. Open **Import data**
2. Drag in the review workbooks — both brands at once is fine
3. Read the report

The report is the point. It tells you rows read, reviews parsed, how many were
added, how many were already there, and anything about the paste worth a look.

Re-importing a file you have already loaded is safe. Every review gets a hash
of SKU + reviewer + date + title + opening text, so overlapping monthly exports
add only what is new. Importing September twice adds 339 then 0.

### If the import is refused

An unrecognised worksheet tab stops the whole import rather than silently
dropping those reviews. Tab names in these exports do not match product names
(`6.2 Air fryer` is `Ninja Air Fryer 6.2L`), so when a new tab name appears,
add it to that SKU's `sheetNames` in **`lib/skus.ts`** and import again.

## What the source data actually looks like

Worth knowing before you change the parser. Each SKU has its own worksheet
holding one long column of raw pasted Amazon blocks — no headers, no columns:

```
Surendhran S                                       <- reviewer
1.0 out of 5 stars Lack of Onsite Assistance...    <- rating + title (NBSP between)
Reviewed in India on 14 July 2026                  <- date + country
Colour: Sea Salt GreyVerified Purchase             <- variant with the flag glued on
I purchased this air fryer during...               <- body, across 1..n rows
Helpful / Report / Customer image / 7 people found this helpful
```

So: the rating line is the only reliable record boundary, `Verified Purchase`
is a substring rather than a column, bodies span a variable number of rows, and
a review can be title-only ("Damaged piece delivered" has no body at all —
which is why titles are always classified alongside bodies).

`lib/parse/workbook.ts` also reads a proper headed table
(`Product, Rating, ReviewText, …`) if it finds one, which is the shape a
scraper export will have. No change needed when that day comes.

## What the numbers will and won't do

339 reviews across 12 SKUs is not a lot, and six SKUs have fewer than ten
verified reviews. Rather than draw charts that look confident, the dashboard
refuses and says why:

| Gate | Threshold | Effect |
|---|---|---|
| Insufficient data badge | < 10 verified reviews | Warning banner across the whole SKU page |
| Word cloud | < 15 reviews in that sentiment | Replaced by a line saying how many there were |
| Rating trend | < 3 months with 3+ verified reviews each | Replaced by the reason |

Top performer and Needs attention are ranked on verified average, and only
across SKUs that clear the insufficient-data bar — otherwise HydroVac's single
five-star review would win the brand.

## Problem-area classification

Negative reviews (1–2★) are sorted into six areas — Product, Delivery/DOA,
Customer Service, Installation/Demo, Returns/Replacement, Marketplace — by
phrase rules in **`lib/classify/keywords.ts`**. A review can land in several;
"arrived damaged and nobody replied" is two problems, not one.

The rules were tuned against the real 112 negative reviews and currently place
111 of them. The one that resists is "Ok. Average", which names no cause, and
it shows up honestly as *Unclassified* rather than being forced somewhere.

To tune: edit the patterns, then re-run them over everything already stored —
no re-import needed:

```bash
curl -X POST http://localhost:3000/api/reclassify -b "snr_session=..."
```

Coverage check while tuning:

```bash
npx tsx scripts/classify-coverage.ts ~/Downloads/SharkNinjaBrief/*.xlsx
```

`classify()` in `lib/classify/index.ts` is deliberately a single function of
`{ title, body, rating } -> Bucket[]`. Replacing keywords with an LLM call
means writing one new function behind that signature; ingest, storage and the
dashboard do not change.

## Executive AI Insights (OpenRouter)

Beyond counts and keyword buckets, each SKU features an executive insight card summarizing consumer sentiment, root cause diagnosis, commercial impact ("so what"), and operational watch points.

Insights are baked into **`data/insights.json`** and validated against review fingerprint hashes (`dataHash`). If new reviews shift the data, the card flags that the analysis reflects earlier data rather than silently showing a stale reading.

To regenerate insights using OpenRouter:

```bash
OPENROUTER_API_KEY=your_key npm run insights:generate
```

Options:
- `--sku <id>`: Regenerate a single SKU only
- `--force`: Regenerate even if `dataHash` is unchanged
- `OPENROUTER_MODEL=...`: Specify model (defaults to `anthropic/claude-3.5-sonnet`)

## Deploying

Live on Vercel, deployed from `master`. Every push redeploys.

`APP_PASSWORD` and `AUTH_SECRET` are set in **`vercel.json`** so the deployment
works without any dashboard setup. That is fine for a private repo and a demo
link, and it is the first thing to change for anything longer-lived: add the
two as project environment variables in the Vercel dashboard (those take
precedence over `vercel.json`) and drop the `env` block from the file.

### Snapshot mode vs live mode

Vercel's filesystem is read-only, so a deployment with no database cannot
accept an upload at all. Rather than serve an empty dashboard, the app falls
back to **`data/seed.json`** — the September export, baked in at build time by
`scripts/build-seed.ts`. Everything on the dashboard is real; only importing is
switched off, and both the home page and the import page say so.

To turn the deployment into the real thing, set `DATABASE_URL` to a Neon
Postgres connection string. Tables are created on first use, there is no
migration step, and the import page becomes a working upload form. Regenerate
the snapshot after a new export with:

```bash
npx tsx scripts/build-seed.ts ~/Downloads/SharkNinjaBrief/*.xlsx
```

## Tests

```bash
npm test
```

26 tests. The parser fixtures are verbatim rows from the September 2026 export
rather than invented examples, and the last suite parses the real workbooks and
asserts the per-SKU counts, so a regression in the record grammar fails loudly.
That suite skips itself if the files aren't on the machine.

### A local build quirk

`npm run build` uses Turbopack, which is what Vercel runs. On some sandboxed
macOS setups Turbopack's CSS worker cannot bind a port and the build fails with
`Operation not permitted (os error 1)`. If that happens locally, use:

```bash
npm run build:webpack
```

Vercel is unaffected.

## Later: automated collection

`POST /api/ingest` already accepts `{ filename, base64 }` JSON authenticated
with an `x-ingest-token` header, which is where a scraper plugs in. The
intended shape:

1. Each SKU's ASIN and Amazon URL is already in `lib/skus.ts`
2. A scheduled Apify run of `junglee/amazon-reviews-scraper`
   (~$0.006/review, so a full 339-review refresh is roughly $2, and incremental
   runs cost cents) with `reviewsCutoffDate` set to the last import
3. Its success webhook POSTs the result to `/api/ingest`
4. Same parse → dedupe → classify path; import history already records the runs

One thing to settle before building it: automated scraping is against Amazon's
terms of service, and the actor is a third party doing it on your behalf. That
is a decision for SharkNinja, not a technical detail.

## Layout

```
lib/parse/records.ts     the record grammar — read this first
lib/parse/workbook.ts    worksheet → reviews, plus the headed-table path
lib/skus.ts              the 12 SKUs, their ASINs, and tab-name mappings
lib/classify/            problem-area rules and the swap-in seam
lib/aggregate.ts         summaries, clouds, themes, trends, and the gates
lib/validate.ts          paste-quality warnings
lib/store.ts             Postgres, with a local file fallback
app/                     login, brand picker, brand overview, SKU detail, import
scripts/                 one-off checks used while tuning the rules
```
