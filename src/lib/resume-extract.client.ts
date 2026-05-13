/**
 * Client-side resume text extraction. PDFs use pdfjs-dist's legacy build
 * (worker disabled — runs in main thread, fine for small resumes). DOCX uses
 * mammoth's browser bundle. Falls back to plain-text reading otherwise.
 */
import mammoth from "mammoth/mammoth.browser";

export async function extractResumeText(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "docx") {
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return (r.value ?? "").trim();
  }
  if (ext === "pdf") {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // disable worker — keeps things simple in the browser sandbox
    pdfjs.GlobalWorkerOptions.workerSrc = "";
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf, useWorker: false, isEvalSupported: false }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    return out.trim();
  }
  // txt / md fallback
  return (await file.text()).trim();
}
