import { NextResponse } from "next/server";
import { ingestBuffer, UnmappedSheetsError } from "@/lib/ingest";
import { ReadOnlyStoreError } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const ACCEPTED = /\.(xlsx|xlsm|xls|csv)$/i;

/**
 * Accepts either a multipart upload (the page's own form) or a JSON body with
 * a base64 file (how a scheduled scraper will call it). Excel or CSV, same
 * pipeline either way.
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

    const wrongType = files.filter((f) => !ACCEPTED.test(f.name));
    if (wrongType.length > 0) {
      return NextResponse.json(
        {
          error: `${wrongType.map((f) => f.name).join(", ")} is not a spreadsheet. Send .xlsx, .xls or .csv — the model template is at /api/template.`,
        },
        { status: 415 },
      );
    }

    const reports = [];
    for (const f of files) {
      reports.push(await ingestBuffer(f.buf, f.name));
    }

    return NextResponse.json({ ok: true, reports });
  } catch (err) {
    // Raised before anything is written, so "nothing was imported" is accurate.
    if (err instanceof UnmappedSheetsError) {
      return NextResponse.json(
        { error: err.message, unmappedSheets: err.sheets },
        { status: 422 },
      );
    }
    if (err instanceof ReadOnlyStoreError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
