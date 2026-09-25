import { TabId } from "../types";
import {
  splitBookGemini,
  generateTabGemini,
  generateTabGeminiStream,
  extractLessonGemini,
  explainSelectionGemini,
  socraticQuestionsGemini,
  generateQuestionGemini,
  generateSemesterPlanGemini,
} from "./geminiDirect";

// When running inside the native mobile app (Capacitor/APK) or the Tauri
// desktop app there is no backend server, so we call the Gemini API directly
// from the client. Tauri v2 exposes window.__TAURI_INTERNALS__.
function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as any).__TAURI_INTERNALS__) return true;
  const cap = (window as any).Capacitor;
  return !!cap && (cap.isNativePlatform ? cap.isNativePlatform() : !!cap.getPlatform && cap.getPlatform() !== "web");
}

export interface SplitBookPayload {
  bookTitle?: string;
  subject?: string;
  grade?: string;
  content?: string;
  pdfBase64?: string;
  pdfFileName?: string;
  fileBase64?: string;
  fileName?: string;
  fileMimeType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  startPage?: number;
  endPage?: number;
  previousUnitsContext?: string[];
}

export interface SplitBookResponse {
  bookSummary?: string;
  units: {
    unitTitle: string;
    lessons: {
      title: string;
      summary: string;
      estimatedDuration?: string;
      keyKeywords?: string[];
      content?: string;
    }[];
  }[];
  modelUsed?: string;
  error?: string;
}

export interface GenerateTabPayload {
  tabType: TabId;
  lessonTitle: string;
  unitTitle: string;
  bookTitle: string;
  lessonContent?: string;
  customPrompt?: string;
  tone?: string;
  pdfBase64?: string;
  onProgress?: (message: string) => void;
  onDelta?: (text: string) => void;
}

export interface GenerateTabResponse {
  success: boolean;
  tabType: TabId;
  format: "json" | "markdown";
  data?: any;
  content?: string;
  rawText?: string;
  error?: string;
}

export async function splitBookWithAI(payload: SplitBookPayload): Promise<SplitBookResponse> {
  if (isNativeApp()) {
    return splitBookGemini(payload);
  }
  const res = await fetch("/api/gemini/split-book", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 413) {
      throw new Error(
        errData.error ||
          "حجم الملف كبير جداً (413). تم تقليص وضغط الصفحات تلقائياً، يُرجى المحاولة مرة أخرى."
      );
    }
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء تقسيم الكتاب`);
  }

  return await res.json();
}

export async function generateTabWithAI(payload: GenerateTabPayload): Promise<GenerateTabResponse> {
  if (isNativeApp()) {
    if (payload.onDelta) {
      return generateTabGeminiStream(payload);
    }
    return generateTabGemini(payload);
  }

  if (payload.onDelta) {
    const { onDelta, onProgress, ...rest } = payload;
    return generateTabStreamWeb(rest, onDelta, onProgress);
  }

  const res = await fetch("/api/gemini/generate-tab", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 413) {
      throw new Error(
        errData.error || "حجم البيانات المرسلة كبير (413). يُرجى تقليص حجم المرفق أو النص."
      );
    }
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء توليد محتوى التبويب`);
  }

  return await res.json();
}

async function generateTabStreamWeb(
  payload: Omit<GenerateTabPayload, "onDelta" | "onProgress">,
  onDelta: (text: string) => void,
  onProgress?: (message: string) => void
): Promise<GenerateTabResponse> {
  const controller = new AbortController();
  (payload as any).__controller = controller;

  let res: Response;
  try {
    res = await fetch("/api/gemini/generate-tab-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("aborted");
    }
    throw err;
  }

  if (res.status === 404) {
    // Server too old for streaming -> fall back to regular endpoint
    const normal = await fetch("/api/gemini/generate-tab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return normal.json();
  }

  if (!res.ok || !res.body) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء التوليد التدريجي`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let lastData: GenerateTabResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const dataStr = line.slice(6).trim();
      if (!dataStr) continue;
      let data: any = {};
      try {
        data = JSON.parse(dataStr);
      } catch {
        continue;
      }
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.delta && typeof data.delta === "string") {
        onDelta(data.text || "");
      } else if (data.done) {
        lastData = {
          success: true,
          tabType: data.tabType,
          format: data.format,
          data: data.data,
          content: data.content,
          rawText: data.rawText,
        } as GenerateTabResponse;
      }
    }
  }

  if (!lastData) {
    throw new Error("انتهى الاتصال دون اكتمال المحتوى. أعد المحاولة.");
  }
  onProgress?.("تم استلام المحتوى بالكامل");
  return lastData;
}

export { generateTabStreamWeb };

export interface GeneratePlanPayload {
  bookTitle: string;
  subject: string;
  grade: string;
  weeksCount: number;
  termLabel: string;
  lessons: {
    title: string;
    unitTitle: string;
    summary?: string;
    duration?: string;
  }[];
  onProgress?: (message: string) => void;
}

export async function generateSemesterPlanWithAI(
  payload: GeneratePlanPayload
): Promise<{ success: boolean; plan: any; modelUsed?: string; error?: string }> {
  if (isNativeApp()) {
    return generateSemesterPlanGemini(payload);
  }
  const res = await fetch("/api/gemini/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء توليد الخطة الفصلية`);
  }
  return await res.json();
}

export interface SocraticQuestionsPayload {
  slideText: string;
  lessonTitle?: string;
}

export async function socraticQuestionsWithAI(
  payload: SocraticQuestionsPayload
): Promise<{ success: boolean; questions: string[]; modelUsed?: string; error?: string }> {
  if (isNativeApp()) {
    return socraticQuestionsGemini(payload);
  }
  const res = await fetch("/api/gemini/socratic-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء توليد أسئلة الحوار`);
  }
  return await res.json();
}

export interface GenerateQuestionPayload {
  selectedText: string;
  lessonTitle?: string;
  questionType?: "mcq" | "true_false" | "essay";
}

export async function generateQuestionWithAI(
  payload: GenerateQuestionPayload
): Promise<{ success: boolean; question: any; modelUsed?: string; error?: string }> {
  if (isNativeApp()) {
    return generateQuestionGemini(payload);
  }
  const res = await fetch("/api/gemini/generate-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء توليد السؤال`);
  }
  return await res.json();
}

export async function extractLessonFromPdf(payload: {
  pdfBase64?: string;
  fileBase64?: string;
  fileMimeType?: string;
  lessonTitle: string;
  bookTitle?: string;
}): Promise<{ success: boolean; summary: string; content: string; modelUsed?: string }> {
  if (isNativeApp()) {
    return extractLessonGemini(payload);
  }
  const res = await fetch("/api/gemini/extract-lesson-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `خطأ في الخادم (${res.status}) أثناء استخراج الدرس من ملف PDF`);
  }

  return await res.json();
}

export interface ExplainSelectionPayload {
  selectedText: string;
  lessonTitle: string;
  unitTitle?: string;
  bookTitle?: string;
  tabType?: string;
  tabTitle?: string;
  lessonContent?: string;
  customInstruction?: string;
}

export interface ExplainSelectionResponse {
  success: boolean;
  explanation: string;
  modelUsed?: string;
  error?: string;
}

export async function explainSelectionWithAI(
  payload: ExplainSelectionPayload
): Promise<ExplainSelectionResponse> {
  if (isNativeApp()) {
    return explainSelectionGemini(payload);
  }
  const res = await fetch("/api/gemini/explain-selection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error || `خطأ في الخادم (${res.status}) أثناء شرح الجزء المحدد`
    );
  }

  return await res.json();
}
