// Document text extraction (OCR pipeline).
//
// Turns an uploaded RFQ document into raw text for the AI/heuristic parser:
//   • text / CSV          → decoded directly
//   • text-based PDF      → pdftotext (poppler) extracts the text layer
//   • scanned PDF         → pages rendered to PNG (pdftoppm) then OCR'd (tesseract)
//   • images              → tesseract OCR
//
// Tesseract is the local OCR engine (spec: Tesseract OCR); poppler's pdftotext
// plays the PDFPlumber/PyMuPDF role for text PDFs. For higher-accuracy or
// handwriting use a PaddleOCR microservice via OCR_SERVICE_URL (see ocrViaService).
//
// Everything is best-effort and degrades gracefully: if a tool is missing or a
// step fails, we return whatever text we have (possibly empty) rather than throw.

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("ocr");

export type SourceType = "TEXT" | "CSV" | "EXCEL" | "PDF" | "IMAGE";

export type ExtractResult = {
  text: string;
  method: "decode" | "pdftotext" | "tesseract" | "pdf-ocr" | "service" | "none";
  pages?: number;
};

/** Map a MIME type / filename to our SourceType. */
export function detectSourceType(mime: string | undefined, filename: string | undefined): SourceType {
  const m = (mime || "").toLowerCase();
  const f = (filename || "").toLowerCase();
  if (m.includes("pdf") || f.endsWith(".pdf")) return "PDF";
  if (m.startsWith("image/") || /\.(png|jpe?g|tiff?|bmp|webp|gif)$/.test(f)) return "IMAGE";
  if (m.includes("csv") || f.endsWith(".csv")) return "CSV";
  if (m.includes("sheet") || m.includes("excel") || /\.(xlsx?|)$/.test(f) && /\.xls/.test(f)) return "EXCEL";
  return "TEXT";
}

/** Run a command, feeding optional stdin, capturing stdout. Rejects on non-zero exit. */
function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 200)}`))));
  });
}

/** Is an external OCR microservice (e.g. PaddleOCR) configured? */
export function isOcrServiceEnabled(): boolean {
  return !!process.env.OCR_SERVICE_URL;
}

/**
 * Send bytes to an external OCR microservice. Expected response: { text: string }.
 * Use for PaddleOCR / handwriting where the local Tesseract engine is weaker.
 */
async function ocrViaService(buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    const res = await fetch(process.env.OCR_SERVICE_URL!, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`OCR service ${res.status}`);
    const data = (await res.json()) as { text?: string };
    return data.text ?? null;
  } catch (e) {
    log.warn({ err: (e as Error).message }, "ocr.service_failed");
    return null;
  }
}

const MIN_PDF_TEXT = 24; // below this we treat a PDF as scanned and OCR it

/** Extract text from a PDF: try the text layer, fall back to per-page OCR. */
async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const dir = await mkdtemp(join(tmpdir(), "ddms-ocr-"));
  const pdfPath = join(dir, "in.pdf");
  try {
    await writeFile(pdfPath, buffer);

    // 1. Text layer via poppler.
    let text = "";
    try {
      text = (await run("pdftotext", [pdfPath, "-"])).trim();
    } catch (e) {
      log.warn({ err: (e as Error).message }, "pdftotext_failed");
    }
    if (text.length >= MIN_PDF_TEXT) {
      return { text, method: "pdftotext" };
    }

    // 2. Scanned PDF → render pages to PNG then OCR each.
    try {
      await run("pdftoppm", ["-png", "-r", "200", pdfPath, join(dir, "page")]);
      const files = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
      const parts: string[] = [];
      for (const f of files) {
        const ocr = await run("tesseract", [join(dir, f), "stdout"]).catch(() => "");
        if (ocr.trim()) parts.push(ocr.trim());
      }
      return { text: parts.join("\n\n").trim(), method: "pdf-ocr", pages: files.length };
    } catch (e) {
      log.warn({ err: (e as Error).message }, "pdf_ocr_failed");
      return { text, method: text ? "pdftotext" : "none" };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** OCR an image buffer with tesseract. */
async function extractImage(buffer: Buffer, ext = "png"): Promise<ExtractResult> {
  const dir = await mkdtemp(join(tmpdir(), "ddms-ocr-"));
  const imgPath = join(dir, `in.${ext}`);
  try {
    await writeFile(imgPath, buffer);
    const text = (await run("tesseract", [imgPath, "stdout"]).catch(() => "")).trim();
    return { text, method: text ? "tesseract" : "none" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Extract text from an uploaded document. `contentType` and `filename` choose
 * the strategy; pass an explicit `sourceType` to override detection.
 */
export async function extractDocumentText(
  buffer: Buffer,
  opts: { contentType?: string; filename?: string; sourceType?: SourceType } = {},
): Promise<ExtractResult> {
  const type = opts.sourceType ?? detectSourceType(opts.contentType, opts.filename);

  // Prefer an external OCR service for images/scanned docs when configured.
  if (isOcrServiceEnabled() && (type === "IMAGE" || type === "PDF")) {
    const svc = await ocrViaService(buffer, opts.contentType || "application/octet-stream");
    if (svc && svc.trim().length >= MIN_PDF_TEXT) return { text: svc.trim(), method: "service" };
    // else fall through to local extraction
  }

  switch (type) {
    case "PDF":
      return extractPdf(buffer);
    case "IMAGE": {
      const ext = (opts.filename?.split(".").pop() || "png").toLowerCase();
      return extractImage(buffer, ext);
    }
    case "CSV":
    case "TEXT":
    case "EXCEL":
    default:
      // Excel is handled upstream (SheetJS); here we just decode text/CSV.
      return { text: buffer.toString("utf8"), method: "decode" };
  }
}
