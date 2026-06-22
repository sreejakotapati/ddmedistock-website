import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { detectSourceType, extractDocumentText } from "../src/lib/services/ocr/extract";

// ── Pure: source-type detection ───────────────────────────────────────────────

test("detectSourceType maps MIME types", () => {
  assert.equal(detectSourceType("image/png", "a.png"), "IMAGE");
  assert.equal(detectSourceType("image/jpeg", "a.jpg"), "IMAGE");
  assert.equal(detectSourceType("application/pdf", "a.pdf"), "PDF");
  assert.equal(detectSourceType("text/csv", "a.csv"), "CSV");
  assert.equal(
    detectSourceType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "a.xlsx"),
    "EXCEL",
  );
  assert.equal(detectSourceType("text/plain", "a.txt"), "TEXT");
});

test("detectSourceType falls back to filename extension", () => {
  assert.equal(detectSourceType("", "scan.PNG"), "IMAGE");
  assert.equal(detectSourceType("", "doc.PDF"), "PDF");
  assert.equal(detectSourceType(undefined, undefined), "TEXT");
});

// ── Decode path: text / CSV need no external tools ────────────────────────────

test("extractDocumentText decodes plain text", async () => {
  const r = await extractDocumentText(Buffer.from("Syringe 5ml - 10 nos"), { sourceType: "TEXT" });
  assert.equal(r.method, "decode");
  assert.match(r.text, /Syringe/);
});

test("extractDocumentText decodes CSV", async () => {
  const r = await extractDocumentText(Buffer.from("item,qty\nGloves,50"), { contentType: "text/csv", filename: "x.csv" });
  assert.equal(r.method, "decode");
  assert.match(r.text, /Gloves/);
});

// ── OCR path: requires tesseract + imagemagick; skip gracefully if absent ─────

const hasTesseract = spawnSync("tesseract", ["--version"]).status === 0;
const hasConvert = spawnSync("convert", ["--version"]).status === 0;

test(
  "tesseract OCR extracts text from a generated image",
  { skip: !hasTesseract || !hasConvert ? "tesseract/imagemagick not installed" : false },
  async () => {
    const png = spawnSync("convert", [
      "-size", "640x80", "xc:white", "-font", "DejaVu-Sans", "-pointsize", "24",
      "-fill", "black", "-annotate", "+10+45", "Disposable Syringe 5ml 500 nos", "png:-",
    ], { maxBuffer: 10 * 1024 * 1024 });
    assert.equal(png.status, 0, "image generation failed");
    const r = await extractDocumentText(png.stdout, { contentType: "image/png", filename: "rfq.png" });
    assert.equal(r.method, "tesseract");
    assert.match(r.text, /Syringe/i);
    assert.match(r.text, /500/);
  },
);
