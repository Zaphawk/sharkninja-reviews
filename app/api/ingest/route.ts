import { NextResponse } from "next/server";
import { ingestBuffer } from "@/lib/ingest";
import { skuForSheet } from "@/lib/skus";
import { ReadOnlyStoreError } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accepts either a multipart upload (the page's own form) or a JSON body with
 * a base64 workbook (how a scheduled scraper will call it). Same pipeline.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const files: { name: string; buf: Buffer }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      for (const entry of form.getAll("file")) {
        if (entry instanceof File) {
          files.push({
            name: entry.name,
            buf: Buffer.from(await entry.arrayBuffer()),
          });
        }
      }
    } else {
      const body = (await req.json()) as {
        filename?: string;
        base64?: string;
      };
      if (!body.base64) {
        return NextResponse.json(
          { error: "Send multipart 'file' fields, or JSON { filename, base64 }." },
          { status: 400 },
        );
      }
      files.push({
        name: body.filename ?? "upload.xlsx",
        buf: Buffer.from(body.base64, "base64"),
      });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    const reports = [];
    for (const f of files) {
      const report = await ingestBuffer(f.buf, f.name);
      // An unrecognised tab means reviews silently vanish, which is the main
      // way a refresh goes wrong. Fail loudly instead.
      if (report.unmappedSheets.length > 0) {
        return NextResponse.json(
          {
            error: `Unrecognised sheet${report.unmappedSheets.length > 1 ? "s" : ""} in ${f.name}: ${report.unmappedSheets.join(", ")}. Add the tab name to lib/skus.ts before importing, or those reviews will be dropped.`,
            unmappedSheets: report.unmappedSheets,
            knownExample: skuForSheet("Combi")?.name,
            report,
          },
          { status: 422 },
        );
      }
      reports.push(report);
    }

    return NextResponse.json({ ok: true, reports });
  } catch (err) {
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
