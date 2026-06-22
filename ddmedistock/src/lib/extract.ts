import * as XLSX from "xlsx";

/**
 * Extract plain text from an uploaded RFQ file.
 *  - CSV / XLSX / XLS  → rows flattened to "cell | cell | …" lines.
 *  - TXT               → raw text.
 *  - PDF / images      → not OCR-able offline; the caller should supply pasted
 *                        text. We return whatever decodes as text, else "".
 *
 * In production this is where the OCR pipeline (Tesseract / cloud Vision) and
 * PDF text extraction would run before handing text to the LLM parser.
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; kind: string }> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const lines: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheetName], {
          header: 1,
          blankrows: false,
          defval: "",
        });
        for (const row of rows) {
          const cells = (row as unknown[]).map((c) => String(c ?? "").trim());
          if (cells.some(Boolean)) lines.push(cells.filter(Boolean).join(" | "));
        }
      }
      return { text: lines.join("\n"), kind: name.endsWith(".csv") ? "CSV" : "EXCEL" };
    } catch {
      return { text: "", kind: "EXCEL" };
    }
  }

  if (name.endsWith(".txt")) {
    return { text: buf.toString("utf-8"), kind: "TEXT" };
  }

  if (name.endsWith(".pdf")) {
    // Best-effort: pull any embedded ASCII text runs from the PDF.
    const ascii = buf.toString("latin1").match(/\(([^()]{3,})\)/g) || [];
    const text = ascii.map((s) => s.slice(1, -1)).join(" ");
    return { text, kind: "PDF" };
  }

  return { text: "", kind: "IMAGE" };
}
