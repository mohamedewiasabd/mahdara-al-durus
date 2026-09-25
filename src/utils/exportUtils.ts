import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import { Lesson, Book, TabId, TabContentRecord } from "../types";
import { TABS_CONFIG } from "../data/tabs";
import {
  isNativeApp,
  writeAndShareFile,
  blobToBase64,
  arrayBufferToBase64,
  ShareResult,
} from "../services/mobileFiles";

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ExportFormat = "pdf" | "md" | "docx" | "html";

export interface ExportMetadata {
  lessonTitle: string;
  unitTitle: string;
  bookTitle: string;
  tabTitle: string;
  tabId: TabId;
  subject?: string;
  grade?: string;
  dateStr?: string;
}

/**
 * Clean plain text / markdown generator for any tab record
 */
export function generateTabMarkdown(
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): string {
  const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
  const title = tabConfig?.title || meta.tabTitle;
  const dateStr =
    meta.dateStr ||
    new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  let header = `# ${title}\n`;
  header += `**الكتاب:** ${meta.bookTitle} | **الوحدة:** ${meta.unitTitle} | **الدرس:** ${meta.lessonTitle}\n`;
  if (meta.subject || meta.grade) {
    header += `**المادة:** ${meta.subject || "عام"} | **الصف:** ${meta.grade || "غير محدد"} | **التاريخ:** ${dateStr}\n`;
  } else {
    header += `**تاريخ الإعداد:** ${dateStr}\n`;
  }
  header += `\n---\n\n`;

  // 1. Markdown-based content tabs
  if (
    record.format === "markdown" ||
    (record.content && !record.data) ||
    [
      "summary",
      "bulletPoints",
      "lessonPlan",
      "activities",
      "criticalThinking",
      "simplifiedExplanation",
      "deepDive",
    ].includes(tabId)
  ) {
    return header + (record.content || "لا يوجد محتوى متوفر.");
  }

  // 2. Specialized structured data tabs
  const data = record.data;
  if (!data) {
    return header + (record.content || "لا يوجد محتوى متوفر.");
  }

  // A. Mind Map
  if (tabId === "mindMap") {
    let md = header;
    md += `## 🧠 الفكرة المركزية: ${data.centerTopic || meta.lessonTitle}\n\n`;
    if (data.description) {
      md += `> ${data.description}\n\n`;
    }
    if (Array.isArray(data.branches)) {
      data.branches.forEach((branch: any, bIdx: number) => {
        md += `### ${bIdx + 1}. 🌿 ${branch.title}\n`;
        if (Array.isArray(branch.subBranches)) {
          branch.subBranches.forEach((sub: any) => {
            md += `- **${sub.title}**: ${sub.details || ""}\n`;
          });
        }
        md += `\n`;
      });
    }
    return md;
  }

  // B. Quiz
  if (tabId === "quiz") {
    let md = header;
    md += `## 📝 بنك الأسئلة والتقويم التفاعلي\n\n`;
    const questions = Array.isArray(data.questions) ? data.questions : [];
    questions.forEach((q: any, idx: number) => {
      const typeLabel =
        q.type === "mcq"
          ? "اختيار من متعدد"
          : q.type === "true_false"
          ? "صح أو خطأ"
          : "سؤال مقالي";
      md += `### السؤال ${idx + 1} (${typeLabel}):\n`;
      md += `**${q.question}**\n\n`;

      if (q.type === "mcq" && Array.isArray(q.options)) {
        q.options.forEach((opt: string, optIdx: number) => {
          const letter = ["أ", "ب", "ج", "د"][optIdx] || `${optIdx + 1}`;
          const isCorrect = q.correctIndex === optIdx;
          md += `- [${letter}] ${opt} ${isCorrect ? "*(الإجابة الصحيحة ✓)*" : ""}\n`;
        });
        md += `\n`;
      } else if (q.type === "true_false") {
        md += `- **الإجابة الصحيحة:** ${q.correctBoolean ? "صح (✓)" : "خطأ (✗)"}\n\n`;
      }

      if (q.modelAnswer) {
        md += `> **الإجابة النموذجية:** ${q.modelAnswer}\n\n`;
      }
      if (q.explanation) {
        md += `> 💡 **التوضيح والتفسير العلمي:** ${q.explanation}\n\n`;
      }
      md += `---\n\n`;
    });
    return md;
  }

  // C. Glossary
  if (tabId === "glossary") {
    let md = header;
    md += `## 📖 معجم المصطلحات والمفاهيم العلمية\n\n`;
    md += `| المصطلح | التصنيف | التعريف والشرح | مثال واقعي | خطأ شائع يجب تجنبه |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    const terms = Array.isArray(data.terms) ? data.terms : [];
    terms.forEach((t: any) => {
      const term = (t.term || "").replace(/\|/g, "/");
      const category = (t.category || "عام").replace(/\|/g, "/");
      const def = (t.definition || "").replace(/\|/g, "/");
      const ex = (t.example || "-").replace(/\|/g, "/");
      const mistake = (t.commonMistake || "-").replace(/\|/g, "/");
      md += `| **${term}** | ${category} | ${def} | ${ex} | ${mistake} |\n`;
    });
    return md;
  }

  // D. Flashcards
  if (tabId === "flashcards") {
    let md = header;
    md += `## 🃏 بطاقات الاستذكار والمراجعة السريعة (Flashcards)\n\n`;
    md += `| # | وجه البطاقة (المفهوم / السؤال) | ظهر البطاقة (الإجابة / الشرح) | تلميح إضافي |\n`;
    md += `| :---: | :--- | :--- | :--- |\n`;
    const cards = Array.isArray(data.cards) ? data.cards : [];
    cards.forEach((c: any, idx: number) => {
      const front = (c.front || "").replace(/\|/g, "/");
      const back = (c.back || "").replace(/\|/g, "/");
      const hint = (c.hint || "-").replace(/\|/g, "/");
      md += `| ${idx + 1} | **${front}** | ${back} | ${hint} |\n`;
    });
    return md;
  }

  return header + (record.content || JSON.stringify(data, null, 2));
}

/**
 * Generate Standalone HTML Document
 */
export function generateTabHTML(
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): string {
  const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
  const title = tabConfig?.title || meta.tabTitle;
  const mdContent = generateTabMarkdown(tabId, record, meta);

  // Convert basic markdown to styled HTML
  const formattedBody = convertMarkdownToHtml(mdContent);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${meta.lessonTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --primary-light: #d1fae5;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.8;
      direction: rtl;
      padding: 30px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    header.doc-header {
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    .badge {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary-dark);
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      color: var(--primary-dark);
      margin-bottom: 10px;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 13px;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 10px 16px;
      border-radius: 12px;
    }
    .meta-item strong {
      color: var(--text);
    }
    h2 {
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      margin: 30px 0 15px 0;
      border-right: 4px solid var(--primary);
      padding-right: 12px;
    }
    h3 {
      font-size: 16px;
      font-weight: 700;
      color: #334155;
      margin: 20px 0 10px 0;
    }
    p {
      margin-bottom: 14px;
      font-size: 14px;
    }
    ul, ol {
      margin: 14px 24px;
      font-size: 14px;
    }
    li {
      margin-bottom: 8px;
    }
    blockquote {
      background: #ecfdf5;
      border-right: 4px solid var(--primary);
      padding: 12px 18px;
      border-radius: 8px;
      margin: 16px 0;
      color: #065f46;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
      background: white;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: right;
    }
    th {
      background: #f8fafc;
      font-weight: 700;
      color: #1e293b;
    }
    tr:nth-child(even) {
      background: #fcfdfe;
    }
    hr {
      border: none;
      border-top: 1px dashed var(--border);
      margin: 24px 0;
    }
    .footer-note {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    .print-btn {
      position: fixed;
      bottom: 25px;
      left: 25px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    .print-btn:hover {
      background: var(--primary-dark);
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <span class="badge">${tabConfig?.badge || "تصدير تعليمي"}</span>
      <h1>${title} - ${meta.lessonTitle}</h1>
      <div class="meta-bar">
        <div class="meta-item"><strong>الكتاب:</strong> ${meta.bookTitle}</div>
        <div class="meta-item"><strong>الوحدة:</strong> ${meta.unitTitle}</div>
        <div class="meta-item"><strong>الدرس:</strong> ${meta.lessonTitle}</div>
        <div class="meta-item"><strong>تاريخ الإعداد:</strong> ${new Date().toLocaleDateString("ar-EG")}</div>
      </div>
    </header>

    <main class="content-body">
      ${formattedBody}
    </main>

    <footer class="footer-note">
      تم إعداد وتصدير هذا المحتوى التعليمي بواسطة المنصة الذكية لتحضير المناهج والكتب المدرسية.
    </footer>
  </div>

  <button class="print-btn" onclick="window.print()">
    🖨️ طباعة / حفظ كـ PDF
  </button>
</body>
</html>`;
}

/**
 * Helper to turn Markdown string into clean HTML tags
 */
function convertMarkdownToHtml(md: string): string {
  // Remove original H1 as it is placed in the header
  const lines = md.split("\n");
  let html = "";
  let inTable = false;
  let inUl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      continue;
    }

    // Skip initial header line
    if (line.startsWith("# ") && i < 3) {
      continue;
    }

    // Table
    if (line.startsWith("|") && line.endsWith("|")) {
      if (line.includes("---")) {
        continue; // delimiter line
      }
      if (!inTable) {
        html += "<table>\n";
        inTable = true;
        const headers = line
          .split("|")
          .filter((c) => c.trim().length > 0)
          .map((c) => `<th>${formatInline(c.trim())}</th>`)
          .join("");
        html += `<thead><tr>${headers}</tr></thead>\n<tbody>\n`;
      } else {
        const cells = line
          .split("|")
          .filter((c) => c.trim().length > 0)
          .map((c) => `<td>${formatInline(c.trim())}</td>`)
          .join("");
        html += `<tr>${cells}</tr>\n`;
      }
      continue;
    } else if (inTable) {
      html += "</tbody></table>\n";
      inTable = false;
    }

    // Headings
    if (line.startsWith("### ")) {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      html += `<h3>${formatInline(line.substring(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      html += `<h2>${formatInline(line.substring(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith("# ")) {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      html += `<h2>${formatInline(line.substring(2))}</h2>\n`;
      continue;
    }

    // Divider
    if (line === "---" || line === "***") {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      html += "<hr>\n";
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      if (inUl) {
        html += "</ul>\n";
        inUl = false;
      }
      html += `<blockquote>${formatInline(line.substring(2))}</blockquote>\n`;
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inUl) {
        html += "<ul>\n";
        inUl = true;
      }
      html += `<li>${formatInline(line.substring(2))}</li>\n`;
      continue;
    }

    if (inUl) {
      html += "</ul>\n";
      inUl = false;
    }

    // Regular paragraph
    html += `<p>${formatInline(line)}</p>\n`;
  }

  if (inUl) html += "</ul>\n";
  if (inTable) html += "</tbody></table>\n";

  return html;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

/**
 * Generate Real Word Document (.docx)
 */
export async function generateTabDocx(
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): Promise<Blob> {
  const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
  const title = tabConfig?.title || meta.tabTitle;
  const mdContent = generateTabMarkdown(tabId, record, meta);
  const lines = mdContent.split("\n");

  const docChildren: any[] = [];

  // Document Title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${title} - ${meta.lessonTitle}`,
          bold: true,
          size: 32, // 16pt
          color: "047857",
          rightToLeft: true,
        }),
      ],
    })
  );

  // Metadata block
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `الكتاب: ${meta.bookTitle}  |  الوحدة: ${meta.unitTitle}  |  الدرس: ${meta.lessonTitle}`,
          size: 20, // 10pt
          color: "475569",
          italics: true,
          rightToLeft: true,
        }),
      ],
    })
  );

  // Parse lines into paragraphs
  let tableRows: TableRow[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Skip first title line since we already added title
    if (rawLine.startsWith("# ") && i < 3) continue;

    // Handle Table
    if (rawLine.startsWith("|") && rawLine.endsWith("|")) {
      if (rawLine.includes("---")) continue; // separator

      const cellTexts = rawLine
        .split("|")
        .filter((c) => c.trim().length > 0)
        .map((c) => c.trim().replace(/\*\*/g, ""));

      const isHeaderRow = !inTable;
      inTable = true;

      const cells = cellTexts.map(
        (cellText) =>
          new TableCell({
            width: {
              size: Math.floor(9000 / Math.max(1, cellTexts.length)),
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: cellText,
                    bold: isHeaderRow,
                    size: isHeaderRow ? 22 : 20,
                    color: isHeaderRow ? "047857" : "1e293b",
                    rightToLeft: true,
                  }),
                ],
              }),
            ],
          })
      );

      tableRows.push(new TableRow({ children: cells }));
      continue;
    } else if (inTable) {
      if (tableRows.length > 0) {
        docChildren.push(
          new Table({
            rows: tableRows,
            alignment: AlignmentType.RIGHT,
            width: { size: 9000, type: WidthType.DXA },
          })
        );
      }
      tableRows = [];
      inTable = false;
    }

    // Headings
    if (rawLine.startsWith("### ")) {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 180, after: 80 },
          children: [
            new TextRun({
              text: rawLine.substring(4).replace(/\*\*/g, ""),
              bold: true,
              size: 24,
              color: "1e293b",
              rightToLeft: true,
            }),
          ],
        })
      );
      continue;
    }

    if (rawLine.startsWith("## ")) {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: rawLine.substring(3).replace(/\*\*/g, ""),
              bold: true,
              size: 28,
              color: "047857",
              rightToLeft: true,
            }),
          ],
        })
      );
      continue;
    }

    // Blockquote
    if (rawLine.startsWith("> ")) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({
              text: `💡 ${rawLine.substring(2).replace(/\*\*/g, "")}`,
              italics: true,
              size: 20,
              color: "065f46",
              rightToLeft: true,
            }),
          ],
        })
      );
      continue;
    }

    // Bullet point
    if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: rawLine.substring(2).replace(/\*\*/g, ""),
              size: 22,
              rightToLeft: true,
            }),
          ],
        })
      );
      continue;
    }

    // Normal paragraph
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: rawLine.replace(/\*\*/g, ""),
            size: 22,
            rightToLeft: true,
          }),
        ],
      })
    );
  }

  // Flush remaining table
  if (inTable && tableRows.length > 0) {
    docChildren.push(
      new Table({
        rows: tableRows,
        alignment: AlignmentType.RIGHT,
        width: { size: 9000, type: WidthType.DXA },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generate a high-quality A4 PDF (A4 @ 96dpi) from the styled HTML by
 * rendering each printable slice with html2canvas and assembling pages with pdf-lib.
 * Works offline inside the Capacitor WebView (no print dialog / download needed).
 */
async function generateTabPdfBytes(
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): Promise<Uint8Array> {
  const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([
    import("html2canvas"),
    import("pdf-lib"),
  ]);

  const html = generateTabHTML(tabId, record, meta);

  // Mount the exported document hidden (offscreen) so it can be rasterized.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "-100000px";
  host.style.width = "794px"; // A4 width @ 96dpi
  host.style.height = "auto";
  host.style.backgroundColor = "#ffffff";
  host.setAttribute("aria-hidden", "true");
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const container = host.querySelector(".container") as HTMLElement;
    if (!container) throw new Error("PDF template container not found");

    container.style.width = "794px";

    // Wait for the Cairo font so Arabic text renders with proper glyphs.
    // Guard with a timeout so a hung font fetch can never freeze the exporter.
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((_, rej) => setTimeout(() => rej(new Error("font wait timeout")), 6000)),
      ]);
    } catch (e) {
      // ignore font-wait failures
    }

    const canvas = await Promise.race([
      html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("توليد صورة الصفحة استغرق وقتاً أطول من المتوقع")), 30000)
      ),
    ]);

    // A4 portrait in points
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    const MARGIN = 40; // points
    const contentWidth = PAGE_WIDTH - MARGIN * 2;
    // Canvas width in px = 794 * scale(2). Map px->pt with that ratio.
    const pxToPt = contentWidth / canvas.width;
    const usablePagePx = Math.floor((PAGE_HEIGHT - MARGIN * 2) / pxToPt);

    const pdf = await PDFDocument.create();
    pdf.setTitle(`${meta.tabTitle} - ${meta.lessonTitle}`);
    pdf.setCreator("محضر الدروس الذكي");

    let offset = 0;
    while (offset < canvas.height) {
      const sliceH = Math.min(usablePagePx, canvas.height - offset);

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      }
      const pngData = pageCanvas.toDataURL("image/png");

      const img = await pdf.embedPng(pngData);
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawImage(img, {
        x: MARGIN,
        y: PAGE_HEIGHT - MARGIN - sliceH * pxToPt,
        width: contentWidth,
        height: sliceH * pxToPt,
      });

      offset += sliceH;
    }

    return await pdf.save();
  } finally {
    host.remove();
  }
}

/**
 * Trigger File Download in Browser
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Open Print Window or hidden iframe for direct PDF generation
 */
export function openPrintPdfWindow(
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
) {
  const html = generateTabHTML(tabId, record, meta);

  // Method 1: Use hidden iframe (Works perfectly inside sandboxes and avoids popup blockers)
  try {
    let printFrame = document.getElementById(
      "pdf-print-iframe"
    ) as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "pdf-print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }

    const frameDoc =
      printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (printErr) {
          console.warn("Iframe print failed, falling back to window.open", printErr);
          fallbackWindowPrint(html, meta);
        }
      }, 500);
      return;
    }
  } catch (e) {
    console.warn("Iframe print error, falling back to window.open", e);
  }

  // Fallback
  fallbackWindowPrint(html, meta);
}

function fallbackWindowPrint(html: string, meta: ExportMetadata) {
  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      return;
    }
  } catch (err) {
    console.warn("window.open blocked:", err);
  }

  // If both blocked, download HTML file
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  triggerDownload(
    blob,
    `${meta.tabTitle}_${meta.lessonTitle.replace(/\s+/g, "_")}.html`
  );
}

/**
 * Unified Exporter for any Tab
 */
export async function exportTabContent(
  format: ExportFormat,
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): Promise<ShareResult | void> {
  if (isNativeApp()) {
    return exportTabContentNative(format, tabId, record, meta);
  }

  const safeLessonTitle = meta.lessonTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
  const safeTabTitle = meta.tabTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
  const baseName = `${safeTabTitle}_${safeLessonTitle}`;

  switch (format) {
    case "md": {
      const md = generateTabMarkdown(tabId, record, meta);
      // Include UTF-8 BOM for perfect Arabic rendering across all apps
      const blob = new Blob(["\uFEFF" + md], {
        type: "text/markdown;charset=utf-8",
      });
      triggerDownload(blob, `${baseName}.md`);
      break;
    }

    case "html": {
      const html = generateTabHTML(tabId, record, meta);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      triggerDownload(blob, `${baseName}.html`);
      break;
    }

    case "docx": {
      const blob = await generateTabDocx(tabId, record, meta);
      triggerDownload(blob, `${baseName}.docx`);
      break;
    }

    case "pdf": {
      openPrintPdfWindow(tabId, record, meta);
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Native (Capacitor) export: write to device Documents + system Share  */
/* ------------------------------------------------------------------ */

async function exportTabContentNative(
  format: ExportFormat,
  tabId: TabId,
  record: TabContentRecord,
  meta: ExportMetadata
): Promise<ShareResult | null> {
  const safeLessonTitle = meta.lessonTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
  const safeTabTitle = meta.tabTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
  const baseName = `${safeTabTitle}_${safeLessonTitle}`;

  const dialogTitle = `${meta.tabTitle} - ${meta.lessonTitle}`;

  switch (format) {
    case "md": {
      const md = generateTabMarkdown(tabId, record, meta);
      return writeAndShareFile({
        filename: `${baseName}.md`,
        data: "\uFEFF" + md,
        mimeType: "text/markdown;charset=utf-8",
        dialogTitle,
      });
    }

    case "html": {
      const html = generateTabHTML(tabId, record, meta);
      return writeAndShareFile({
        filename: `${baseName}.html`,
        data: html,
        mimeType: "text/html;charset=utf-8",
        dialogTitle,
      });
    }

    case "docx": {
      const blob = await generateTabDocx(tabId, record, meta);
      const b64 = await blobToBase64(blob);
      return writeAndShareFile({
        filename: `${baseName}.docx`,
        data: b64,
        mimeType: MIME_DOCX,
        asBase64: true,
        dialogTitle,
      });
    }

    case "pdf": {
      const bytes = await generateTabPdfBytes(tabId, record, meta);
      const b64 = arrayBufferToBase64(bytes);
      return writeAndShareFile({
        filename: `${baseName}.pdf`,
        data: b64,
        mimeType: "application/pdf",
        asBase64: true,
        dialogTitle,
      });
    }
  }
  return null;
}
