import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Bucket, IngestReport, Review } from "./types";

export type ImportRecord = {
  id: string;
  filename: string;
  createdAt: string;
  report: IngestReport;
};

export interface Store {
  kind: "postgres" | "file";
  init(): Promise<void>;
  insertReviews(
    rows: Review[],
    importId: string,
  ): Promise<{ inserted: number; duplicates: number }>;
  allReviews(): Promise<Review[]>;
  setBuckets(updates: { hash: string; buckets: Bucket[] }[]): Promise<number>;
  recordImport(rec: ImportRecord): Promise<void>;
  listImports(): Promise<ImportRecord[]>;
  clear(): Promise<void>;
}

/* ------------------------------------------------------------------ postgres */

const SCHEMA = `
create table if not exists reviews (
  hash          text primary key,
  sku_id        text        not null,
  reviewer      text        not null,
  rating        smallint    not null,
  title         text        not null,
  body          text        not null,
  review_date   date        not null,
  verified      boolean     not null,
  country       text        not null,
  variant       text,
  buckets       text[]      not null default '{}',
  import_id     text        not null,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_sku_idx  on reviews (sku_id);
create index if not exists reviews_date_idx on reviews (review_date);

create table if not exists imports (
  id         text primary key,
  filename   text        not null,
  created_at timestamptz not null default now(),
  report     jsonb       not null
);
`;

function postgresStore(url: string): Store {
  // Imported lazily so the file store works with no pg driver resolution.
  type Sql = ReturnType<typeof import("postgres")>;
  let sql: Sql | null = null;

  async function db(): Promise<Sql> {
    if (!sql) {
      const { default: postgres } = await import("postgres");
      sql = postgres(url, { ssl: "require", max: 3, idle_timeout: 20 });
    }
    return sql;
  }

  return {
    kind: "postgres",
    async init() {
      const s = await db();
      await s.unsafe(SCHEMA);
    },
    async insertReviews(rows, importId) {
      if (rows.length === 0) return { inserted: 0, duplicates: 0 };
      const s = await db();
      const payload = rows.map((r) => ({
        hash: r.hash,
        sku_id: r.skuId,
        reviewer: r.reviewer,
        rating: r.rating,
        title: r.title,
        body: r.body,
        review_date: r.reviewDate,
        verified: r.verified,
        country: r.country,
        variant: r.variant,
        buckets: r.buckets,
        import_id: importId,
      }));
      const done = await s`
        insert into reviews ${s(payload)}
        on conflict (hash) do nothing
        returning hash
      `;
      return {
        inserted: done.length,
        duplicates: rows.length - done.length,
      };
    },
    async allReviews() {
      const s = await db();
      const rows = await s<
        {
          hash: string; sku_id: string; reviewer: string; rating: number;
          title: string; body: string; review_date: Date; verified: boolean;
          country: string; variant: string | null; buckets: string[];
        }[]
      >`select * from reviews order by review_date desc`;
      return rows.map((r) => ({
        hash: r.hash,
        skuId: r.sku_id,
        reviewer: r.reviewer,
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewDate:
          r.review_date instanceof Date
            ? r.review_date.toISOString().slice(0, 10)
            : String(r.review_date).slice(0, 10),
        verified: r.verified,
        country: r.country,
        variant: r.variant,
        buckets: r.buckets as Bucket[],
      }));
    },
    async setBuckets(updates) {
      if (updates.length === 0) return 0;
      const s = await db();
      let n = 0;
      for (const u of updates) {
        await s`update reviews set buckets = ${u.buckets} where hash = ${u.hash}`;
        n++;
      }
      return n;
    },
    async recordImport(rec) {
      const s = await db();
      await s`
        insert into imports (id, filename, created_at, report)
        values (${rec.id}, ${rec.filename}, ${rec.createdAt}, ${s.json(rec.report as never)})
        on conflict (id) do nothing
      `;
    },
    async listImports() {
      const s = await db();
      const rows = await s<
        { id: string; filename: string; created_at: Date; report: IngestReport }[]
      >`select * from imports order by created_at desc limit 50`;
      return rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        createdAt: new Date(r.created_at).toISOString(),
        report: r.report,
      }));
    },
    async clear() {
      const s = await db();
      await s`delete from reviews`;
      await s`delete from imports`;
    },
  };
}

/* ---------------------------------------------------------------------- file */

/**
 * Local-development store. Vercel's filesystem is ephemeral, so this is not a
 * production backend — the dashboard says so out loud when it is in use.
 */
function fileStore(path: string): Store {
  type Shape = { reviews: Review[]; imports: ImportRecord[] };

  async function read(): Promise<Shape> {
    try {
      return JSON.parse(await readFile(path, "utf8")) as Shape;
    } catch {
      return { reviews: [], imports: [] };
    }
  }
  async function write(data: Shape) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(data, null, 2));
  }

  return {
    kind: "file",
    async init() {
      await mkdir(dirname(path), { recursive: true });
    },
    async insertReviews(rows, importId) {
      void importId;
      const data = await read();
      const seen = new Set(data.reviews.map((r) => r.hash));
      let inserted = 0;
      let duplicates = 0;
      for (const r of rows) {
        if (seen.has(r.hash)) {
          duplicates++;
          continue;
        }
        seen.add(r.hash);
        data.reviews.push(r);
        inserted++;
      }
      await write(data);
      return { inserted, duplicates };
    },
    async allReviews() {
      const data = await read();
      return data.reviews
        .slice()
        .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
    },
    async setBuckets(updates) {
      const data = await read();
      const byHash = new Map(updates.map((u) => [u.hash, u.buckets]));
      let n = 0;
      for (const r of data.reviews) {
        const b = byHash.get(r.hash);
        if (b) {
          r.buckets = b;
          n++;
        }
      }
      await write(data);
      return n;
    },
    async recordImport(rec) {
      const data = await read();
      data.imports.unshift(rec);
      await write(data);
    },
    async listImports() {
      return (await read()).imports.slice(0, 50);
    },
    async clear() {
      await write({ reviews: [], imports: [] });
    },
  };
}

/* -------------------------------------------------------------------- picker */

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  cached = url
    ? postgresStore(url)
    : fileStore(join(process.cwd(), ".data", "store.json"));
  return cached;
}

export const usingEphemeralStore = () =>
  !process.env.DATABASE_URL && process.env.NODE_ENV === "production";
