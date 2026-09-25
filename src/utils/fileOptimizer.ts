import { PDFDocument } from "pdf-lib";

export interface OptimizedFileResult {
  dataUrl: string;
  cleanBase64: string;
  mimeType: string;
  originalSize: number;
  originalSizeFormatted: string;
  optimizedSize?: number;
  optimizedSizeFormatted?: string;
  isOptimized: boolean;
  optimizationNote?: string;
  pageCount?: number;
  extractedPages?: number;
  textContent?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Optimizes an image file by resizing it to a maximum dimension (e.g. 2048px)
 * and compressing to high-quality JPEG.
 */
async function optimizeImage(file: File): Promise<OptimizedFileResult> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة."));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        // Fallback to original image if browser fails to decode image
        const cleanBase64 = src.replace(/^data:[^;]+;base64,/, "");
        resolve({
          dataUrl: src,
          cleanBase64,
          mimeType: file.type || "image/jpeg",
          originalSize,
          originalSizeFormatted: formatBytes(originalSize),
          isOptimized: false,
        });
      };
      img.onload = () => {
        const MAX_DIM = 2048;
        let { width, height } = img;

        if (width <= MAX_DIM && height <= MAX_DIM && originalSize < 2 * 1024 * 1024) {
          const cleanBase64 = src.replace(/^data:[^;]+;base64,/, "");
          resolve({
            dataUrl: src,
            cleanBase64,
            mimeType: file.type || "image/jpeg",
            originalSize,
            originalSizeFormatted: formatBytes(originalSize),
            isOptimized: false,
          });
          return;
        }

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const cleanBase64 = src.replace(/^data:[^;]+;base64,/, "");
          resolve({
            dataUrl: src,
            cleanBase64,
            mimeType: file.type || "image/jpeg",
            originalSize,
            originalSizeFormatted: formatBytes(originalSize),
            isOptimized: false,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const cleanBase64 = optimizedDataUrl.replace(/^data:[^;]+;base64,/, "");
        const estimatedSize = Math.round((cleanBase64.length * 3) / 4);

        resolve({
          dataUrl: optimizedDataUrl,
          cleanBase64,
          mimeType: "image/jpeg",
          originalSize,
          originalSizeFormatted: formatBytes(originalSize),
          optimizedSize: estimatedSize,
          optimizedSizeFormatted: formatBytes(estimatedSize),
          isOptimized: true,
          optimizationNote: `تم تحسين دقة وحجم الصورة (${formatBytes(originalSize)} ➔ ${formatBytes(estimatedSize)}) لتسريع التحليل ومنع مشاكل الرفع.`,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a PDF file for book splitting.
 * If the PDF is larger than 6MB or has more than 15-20 pages,
 * it extracts the first 20 pages (which contain the cover, syllabus outline,
 * table of contents, and introductory chapters) to avoid HTTP 413 Payload Too Large
 * and ensure lightning-fast AI analysis.
 */
async function optimizePdf(file: File): Promise<OptimizedFileResult> {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  try {
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // If PDF is small and has few pages, keep full PDF
    const MAX_PAGES_FOR_SPLIT = 20;
    const MAX_DIRECT_SIZE = 8 * 1024 * 1024; // 8MB

    if (totalPages <= MAX_PAGES_FOR_SPLIT && originalSize <= MAX_DIRECT_SIZE) {
      const bytes = await srcDoc.save();
      const base64 = uint8ArrayToBase64(bytes);
      const dataUrl = `data:application/pdf;base64,${base64}`;

      return {
        dataUrl,
        cleanBase64: base64,
        mimeType: "application/pdf",
        originalSize,
        originalSizeFormatted: formatBytes(originalSize),
        pageCount: totalPages,
        extractedPages: totalPages,
        isOptimized: false,
      };
    }

    // PDF is large or has many pages: extract the first 20 pages (Table of contents + initial units)
    const pagesToExtract = Math.min(totalPages, MAX_PAGES_FOR_SPLIT);
    const subDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: pagesToExtract }, (_, i) => i);
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => subDoc.addPage(p));

    const optimizedBytes = await subDoc.save();
    const base64 = uint8ArrayToBase64(optimizedBytes);
    const dataUrl = `data:application/pdf;base64,${base64}`;
    const optimizedSize = optimizedBytes.length;

    return {
      dataUrl,
      cleanBase64: base64,
      mimeType: "application/pdf",
      originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      optimizedSize,
      optimizedSizeFormatted: formatBytes(optimizedSize),
      pageCount: totalPages,
      extractedPages: pagesToExtract,
      isOptimized: true,
      optimizationNote: `تم استخراج أول ${pagesToExtract} صفحة تلقائياً (الفهرس وخريطة الوحدات الدراسية من إجمالي ${totalPages} صفحة) لتسريع التحليل وتفادي تجاوز حد الخادم (${formatBytes(originalSize)} ➔ ${formatBytes(optimizedSize)}).`,
    };
  } catch (pdfErr) {
    console.warn("Could not slice PDF with pdf-lib:", pdfErr);

    // If file is below 15MB, fallback to raw base64
    if (originalSize <= 15 * 1024 * 1024) {
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = uint8ArrayToBase64(bytes);
      const dataUrl = `data:application/pdf;base64,${base64}`;

      return {
        dataUrl,
        cleanBase64: base64,
        mimeType: "application/pdf",
        originalSize,
        originalSizeFormatted: formatBytes(originalSize),
        isOptimized: false,
      };
    }

    throw new Error(
      `ملف الـ PDF كبير جداً (${formatBytes(originalSize)}) ومحمي أو تعذر تقسيمه. يُرجى رفع أول 20 صفحة (الفهرس) أو ملف أصغر من 15 ميجابايت.`
    );
  }
}

/**
 * Fast Uint8Array to base64 converter that does not overflow the call stack
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const CHUNK_SIZE = 0x8000; // 32KB chunks to prevent stack overflow

  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }

  return btoa(binary);
}

/**
 * Chunk representation for multi-part sequential PDF analysis.
 */
export interface PdfChunk {
  chunkIndex: number; // 0-based
  totalChunks: number;
  startPage: number; // 1-based inclusive
  endPage: number; // 1-based inclusive
  dataUrl: string;
  cleanBase64: string;
  sizeBytes: number;
  sizeFormatted: string;
}

/**
 * Slices any PDF document into sequential, lightweight chunks of pages
 * to analyze the entire book from start to finish sequentially.
 */
export async function slicePdfIntoChunks(
  file: File,
  pagesPerChunk: number = 20
): Promise<{
  totalPages: number;
  chunks: PdfChunk[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const effectivePagesPerChunk = Math.max(5, pagesPerChunk);
  const totalChunks = Math.max(1, Math.ceil(totalPages / effectivePagesPerChunk));
  const chunks: PdfChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startIdx = i * effectivePagesPerChunk;
    const endIdx = Math.min((i + 1) * effectivePagesPerChunk, totalPages);
    const subDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: endIdx - startIdx }, (_, k) => startIdx + k);
    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => subDoc.addPage(p));

    const bytes = await subDoc.save();
    const base64 = uint8ArrayToBase64(bytes);
    chunks.push({
      chunkIndex: i,
      totalChunks,
      startPage: startIdx + 1,
      endPage: endIdx,
      dataUrl: `data:application/pdf;base64,${base64}`,
      cleanBase64: base64,
      sizeBytes: bytes.length,
      sizeFormatted: formatBytes(bytes.length),
    });
  }

  return { totalPages, chunks };
}

/**
 * Intelligently merges sequentially analyzed units and lessons from consecutive book chunks.
 */
export function mergeSequentialUnits(
  existingUnits: {
    unitTitle: string;
    lessons: {
      title: string;
      summary: string;
      estimatedDuration?: string;
      keyKeywords?: string[];
      content?: string;
    }[];
  }[],
  newUnits: {
    unitTitle: string;
    lessons: {
      title: string;
      summary: string;
      estimatedDuration?: string;
      keyKeywords?: string[];
      content?: string;
    }[];
  }[]
): {
  unitTitle: string;
  lessons: {
    title: string;
    summary: string;
    estimatedDuration: string;
    keyKeywords: string[];
    content: string;
  }[];
}[] {
  // Normalize existing units
  const merged: {
    unitTitle: string;
    lessons: {
      title: string;
      summary: string;
      estimatedDuration: string;
      keyKeywords: string[];
      content: string;
    }[];
  }[] = existingUnits.map((u) => ({
    unitTitle: u.unitTitle,
    lessons: u.lessons.map((l) => ({
      title: l.title,
      summary: l.summary || "",
      estimatedDuration: l.estimatedDuration || "45 دقيقة",
      keyKeywords: l.keyKeywords || [],
      content: l.content || "",
    })),
  }));

  for (const nu of newUnits) {
    if (!nu.unitTitle || !nu.lessons?.length) continue;

    const cleanNew = nu.unitTitle.trim().toLowerCase();
    // Look for matching unit
    const matchIdx = merged.findIndex((eu) => {
      const cleanEu = eu.unitTitle.trim().toLowerCase();
      return (
        cleanEu === cleanNew ||
        cleanEu.replace(/^(الوحدة|الفصل|الباب)\s*\S*\s*[:\-]\s*/, "").trim() ===
          cleanNew.replace(/^(الوحدة|الفصل|الباب)\s*\S*\s*[:\-]\s*/, "").trim()
      );
    });

    const normalizedNewLessons = nu.lessons.map((l) => ({
      title: l.title,
      summary: l.summary || "",
      estimatedDuration: l.estimatedDuration || "45 دقيقة",
      keyKeywords: l.keyKeywords || [],
      content: l.content || "",
    }));

    if (matchIdx >= 0) {
      const targetUnit = merged[matchIdx];
      for (const nl of normalizedNewLessons) {
        const alreadyExists = targetUnit.lessons.some(
          (el) => el.title.trim().toLowerCase() === nl.title.trim().toLowerCase()
        );
        if (!alreadyExists) {
          targetUnit.lessons.push(nl);
        }
      }
    } else {
      merged.push({
        unitTitle: nu.unitTitle,
        lessons: [...normalizedNewLessons],
      });
    }
  }

  return merged;
}

/**
 * Main dispatcher to prepare and optimize any uploaded file for AI analysis.
 */
export async function optimizeFileForUpload(file: File): Promise<OptimizedFileResult> {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const isImage =
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(file.name);

  if (isPdf) {
    return await optimizePdf(file);
  }

  if (isImage) {
    return await optimizeImage(file);
  }

  // Plain text / markdown
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة الملف النصي."));
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve({
        dataUrl: "",
        cleanBase64: "",
        textContent: text,
        mimeType: file.type || "text/plain",
        originalSize: file.size,
        originalSizeFormatted: formatBytes(file.size),
        isOptimized: false,
      });
    };
    reader.readAsText(file);
  });
}
