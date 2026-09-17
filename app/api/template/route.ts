import { templateCsv, templateWorkbook } from "@/lib/template";

export const runtime = "nodejs";

/**
 * The blank model template, generated from lib/template.ts rather than kept as
 * a checked-in file, so the columns it hands out and the columns the parser
 * accepts cannot drift apart.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const blank =
    url.searchParams.get("blank") === "1" ||
    url.searchParams.get("blank") === "true";

  if (format === "csv") {
    const filename = blank
      ? "review-import-template-blank.csv"
      : "review-import-template-sample.csv";
    return new Response(templateCsv({ blank }), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  }

  const filename = blank
    ? "review-import-template-blank.xlsx"
    : "review-import-template-sample.xlsx";
  const buf = templateWorkbook({ blank });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
