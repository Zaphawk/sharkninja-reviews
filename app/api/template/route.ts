import { templateCsv, templateWorkbook } from "@/lib/template";

export const runtime = "nodejs";

/**
 * The blank model template, generated from lib/template.ts rather than kept as
 * a checked-in file, so the columns it hands out and the columns the parser
 * accepts cannot drift apart.
 */
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";

  if (format === "csv") {
    return new Response(templateCsv(), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="review-import-template.csv"',
        "cache-control": "no-store",
      },
    });
  }

  const buf = templateWorkbook();
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="review-import-template.xlsx"',
      "cache-control": "no-store",
    },
  });
}
