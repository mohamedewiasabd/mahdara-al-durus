import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Handle payload too large (413) gracefully
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.status === 413 || err.type === "entity.too.large")) {
    return res.status(413).json({
      error: "حجم الملف المرسل كبير جداً (413). لقد قام التطبيق بتفعيل التقليص التلقائي للملفات، يرجى إعادة المحاولة.",
    });
  }
  next(err);
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Multi-model fallback engine
async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  // Use gemini-3.1-flash-lite as first choice for high reliability and ultra-fast speed,
  // or fall back between gemini-3.1-flash-lite, gemini-3.8-flash, and gemini-flash-latest
  const preferredModel = params.primaryModel || "gemini-3.1-flash-lite";
  const fallbackModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  const modelsToTry = [
    preferredModel,
    ...fallbackModels.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[AI Engine] Model ${model} failed:`, err?.message || err);
      lastError = err;
      // Continue to next fallback model
    }
  }

  throw lastError || new Error("فشلت جميع نماذج الذكاء الاصطناعي في إتمام الطلب.");
}

// Streaming variant with model fallback (only the stream-start is fallbackable)
async function streamWithFallback(ai: any, contents: any, config: any) {
  const primaryModel = "gemini-3.1-flash-lite";
  const fallbackModels = ["gemini-3.8-flash", "gemini-flash-latest"];
  const modelsToTry = [
    primaryModel,
    ...fallbackModels.filter((m) => m !== primaryModel),
  ];
  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });
      return { stream, modelUsed: model };
    } catch (err: any) {
      console.warn(`[AI Engine] Model ${model} failed to stream:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("فشلت جميع نماذج الذكاء الاصطناعي في بدء التوليد التدريجي.");
}

// Clean & Parse JSON safely
function cleanAndParseJson(rawText: string | undefined): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  // Remove markdown code fences ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Try to find the outermost JSON object or array
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (err2) {
        // failed inner regex
      }
    }
    console.error("[JSON Parse Error] Raw text was:", rawText.slice(0, 300));
    throw new Error("تعذر استخراج بيانات المنهج بصيغة صالحة من مخرجات الذكاء الاصطناعي.");
  }
}

// Strict output rule so generated tabs NEVER start with assistant greetings,
// self-introductions or chatty transition phrases (this distorts the result).
const NO_CHATTER_RULE = `
### قاعدة مطلقة للإخراج (لا تنتهكها تحت أي ظرف):
- ابدأ الناتج مباشرةً بالمحتوى المطلوب؛ أول ما يُكتب يجب أن يكون عنوان المحتوى أو أول نقطة فيه، دون أي شيء قبله.
- ممنوع منعاً باتاً: أي تحية أو ترحيب (أهلاً بك، أهلاً بيك، مرحباً، السلام عليكم، أهلًا وسهلًا، صباح الخير...).
- ممنوع منعاً باتاً: مناداة أو مخاطبة المستخدم بالاسم أو بلقب (عزيزي، أستاذي، يا فلان...).
- ممنوع منعاً باتاً: تقديم النفس أو التعريف بالمخرج (أنا مساعدك، أنا خبير، بصفتي مساعداً...).
- ممنوع منعاً باتاً: أي جملة تمهيدية أو انتقالية مثل (إليك، سأقدم لك، هذا هو الملخص المطلوب، في هذا التلخيص سأعرض، دعني...).
- لا تبدأ أبداً بكلمات مثل (حاضر، بالتأكيد، طبعاً، بكل سرور...).
`;

const MATH_RULE = `
### قواعد الرموز العلمية والرياضية (عربية بالكامل):
- كل رمز علمي أو رياضي (كسور، أسس، جذور، نسب مثلثية، لوغاريتمات، قيم مطلقة، معادلات فيزيائية وهندسية) اكتبه بصيغة LaTeX حقيقية قابلة للعرض رياضياً: داخل السطر بين $...$، والمعادلة المستقلة بين $$...$$. لا تكتب أي صيغة نصية مثل "1/2" أو "2^3" أو "x^2" أو "جذر 2".
- المتغيرات والأرقام عربية 100%:
  * استخدم الأرقام العربية (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩) لا الأرقام الإنجليزية (0،1،2...9).
  * استخدم أسماء متغيرات عربية (س، ص، ع، ن، ك، ز، ط، ج...) لا اللاتينية (x, y, z, a, b, v, m...).
  * كل حرف رقم أو متغير عربي داخل الصيغة يُوضع بين \text{...} ولا يُترك خاماً، مثل: \$\$\\frac{\\text{المسافة}}{\\text{الزمن}}\$\$ و \$\$\\text{س}^{\\text{٣}}+\\text{ص}^{\\text{٢}}=\\text{ع}^{\\text{٢}}\$\$ و \$\$\\text{ك}=\\frac{\\text{١}}{\\text{٢}}\\times\\text{ع}^{\\text{٢}}\$\$.
- اكتب الأسس والكسور والجذور والقيم المطلقة بالشكل الرياضي السليم كما في الكتب:
  * الأس دائماً بترميز الأس: \$\$\\text{س}^{\\text{٣}}\$\$ وليس س3.
  * القسمة بكسر فعلي: \$\$\\frac{\\text{البسط}}{\\text{المقام}}\$\$ وليس 1/2.
  * الجذر: \$\$\\sqrt{...}\$\$.
  * القيمة المطلقة: \$\$\\lvert ...\\rvert\$\$ وليس |...|.
- حرف الخط الرأسي | ممنوع نهائياً في النص العادي وداخل خلايا الجداول (لأنه عامود الجدول في Markdown): أي قيمة مطلقة أو معامل لا تكتبها إلا داخل LaTeX بالصيغة \$\$\\lvert ...\\rvert\$\$.
- حالة البراكيت/الأنظمة الكمية (Ket|null) مثل |0⟩ و |1⟩ و |ψ⟩: لا تكتبها بخاصية | صريحة في النص أبداً، وإنما من داخل LaTeX بالصيغة الصحيحة الوحيدة: \$\$\\lvert \\psi\\rangle\$، \$\$\\lvert 0\\rangle\$، \$\$\\lvert 1\\rangle\$، ولا يخرج شيء منها خارج $...$.
- كل معادلة مضمومة داخل $...$ أو $$...$$ لا يُقطع نصها ولا يُترك أحدها بلا نظير، ولا تبدأ أي سطر بالنقطة | أو بالرمز $. ولا تضع معادلة LaTeX في خلية جدول إلا عبر \lvert و\rvert و\rangle وليس | صريحة.
- استخدم رموز LaTeX الصحيحة للعلاقات: الضرب \$\times\$ أو \$\cdot\$، المقارنة \$\leq\$ و \$\geq\$، لا يساوي \$\neq\$، التقريبي \$\approx\$، السهم \$\rightarrow\$، \$\pi\$، \$\Delta\$، \$\theta\$، \$\sqrt{\}$.
`;

const DEEP_DIVE_FULL_PROMPT = `
قم بإعداد "الشرح التفصيلي المعمّق (تفاصيل التفاصيل)" لهذا الدرس كما لو كان كاتباً خبيراً عاش هذه المادة فعلاً منذ نشأة هذا العلم وسماها بيده:
1. ابدأ من جذور الموضوع: لماذا وُجد هذا المفهوم، وما الحاجة التي دعت إليه ومن أين جاء، بخلفية تأسيسية قوية تعطي قارئها ثقةً بالنص.
2. فكّك الموضوع إلى تفاصيله الدقيقة ذرّةً ذرّةً: علّل كل تفصيلة واربطها بما قبلها وما بعدها حتى تكتمل الصورة كاملة ولا يبقى سؤال معلق.
3. زوّد الشرح بأمثلة واقعية ملموسة من الحياة اليومية والتعاملات العملية، وتشبيهات حية تعلق بالذهن، وصور معرفية تجعل المجرد محسوساً.
4. اجمع بين المعرفة العميقة والمشهد الحي: اشرح كمن عاش هذا العلم منذ لحظة ولادته ويروي كيف تكوّن وكيف يعمل الآن وكيف سيتطور بعد ذلك.
5. إذا كان الموضوع كبيراً أو متشعباً فلا تجمعه في فقرة واحدة: بل قسّم أفكاره إلى أقسام مرقّمة مرتبة، وولّد كل قسم بالترتيب واحداً بعد الآخر (دون اختصار أي قسم) حتى يكتمل الشرح التفصيلي بلا نقصان، مع الانتقال السلس بين الأقسام وترقيمها.
6. اختم بخلاصة جامعة لأهم التفاصيل الدقيقة، ثم سؤال تحفيزي واحد يدفع القارئ للتعمق بنفسه.
استخدم تنسيق Markdown غنيّ بالعناوين والفقرات والنقاط والقوائم، وعلّم الأمثلة ببادئة (مثال:) والتشبيهات ببادئة (تشبيه:) و(تخيّل:).
`;

function parseDeepDiveOutline(rawText: string): string[] {
  try {
    const parsed = cleanAndParseJson(rawText);
    const list: any[] = Array.isArray(parsed?.sections)
      ? parsed.sections
      : Array.isArray(parsed)
        ? parsed
        : [];
    const titles = list
      .map((s: any) =>
        s && typeof s === "object" && typeof s.title === "string"
          ? s.title
          : typeof s === "string"
            ? s
            : ""
      )
      .map((t: string) => t.replace(/^\s*(\d+[.)-]|[-*])\s*/u, "").trim())
      .filter((t: string) => t.length > 2)
      .filter((t: string, idx: number, arr: string[]) => idx === 0 || t !== arr[idx - 1])
      .slice(0, 9);
    return titles;
  } catch {
    return [];
  }
}

async function generateDeepDiveSequentialServer(opts: {
  ai: GoogleGenAI;
  systemInstruction: string;
  baseContext: string;
  customPrompt?: string;
}): Promise<{ content: string; modelUsed: string }> {
  const { ai, systemInstruction, baseContext, customPrompt } = opts;

  const outlinePrompt = `${baseContext}

المطلوب الآن: تحضير خطة تقسيم لهذا الدرس ضمن "الشرح التفصيلي المعمّق (تفاصيل التفاصيل)".
اقرأ الدرس كاملاً، وصمّم قائمة أقسام مرقّمة بالترتيب تغطي الموضوع كله من جذوره ونشأته وحتى أدق تفاصيله، بحيث:
- كل قسم يعالج محوراً واحداً متسقاً غير متداخل مع غيره.
- عدد الأقسام يتناسب مع حجم الموضوع: موضوع صغير 3 أقسام، متوسط 4-6، كبير ومتشعب حتى 9.
- العناوين موجزة ومعبّرة (بدون أي شرح أو نقاط داخل القيم).
${customPrompt ? `مع مراعاة هذا التوجيه الخاص: "${customPrompt}"` : ""}
أخرِج النتيجة بصيغة JSON حصراً بالهيكل التالي:
{
  "sections": [{"title": "عنوان القسم الأول"}, {"title": "عنوان القسم الثاني"}]
}`;

  let outlineSections: string[] = [];
  let lastOutlineError: any = null;
  for (let attempt = 0; attempt < 2 && outlineSections.length === 0; attempt++) {
    try {
      const { response, modelUsed } = await generateWithFallback(ai, {
        contents: outlinePrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });
      void modelUsed;
      outlineSections = parseDeepDiveOutline(response.text || "");
      if (outlineSections.length === 0) {
        throw new Error("خطة الأقسام فارغة");
      }
    } catch (err) {
      lastOutlineError = err;
      console.warn(`[DeepDive] outline step attempt ${attempt + 1} failed:`, (err as any)?.message);
    }
  }
  if (outlineSections.length === 0) {
    const fallbackErr: any = new Error("فشل تقسيم الأقسام، سيتم اللجوء إلى التوليد المباشر.");
    fallbackErr.fallbackToSingleShot = true;
    fallbackErr.cause = lastOutlineError;
    throw fallbackErr;
  }

  const total = outlineSections.length;
  const parts: string[] = [];
  let modelUsed = "";

  for (let i = 0; i < total; i++) {
    const title = outlineSections[i];
    const displayIndex = i + 1;
    const previousTitles = outlineSections.slice(0, i);
    const isLast = i === total - 1;

    const partPrompt = `${baseContext}

الآن أَنتَ تكتب القسم ${displayIndex} من ${total} وحده في "الشرح التفصيلي المعمّق (تفاصيل التفاصيل)".
عنوان هذا القسم: "${title}"
${previousTitles.length > 0 ? `الأقسام التي غُطّيت قبله بالترتيب: ${previousTitles.join("، ")}.\nابتعد تماماً عن تكرار ما سُبق شرُح؛ واصل سلساً من حيث انتهى الجزء السابق وتعمّق في هذا القسم بجديد غير مكرر.` : ""}

استخدم منهجية الكاتب الخبير الذي عاش هذا العلم منذ نشأته:
1. الجذور والحاجة: لماذا وُجد هذا الجزء، ومن أين جاء، ومن وضعه أول مرة (بحسب طبيعة القسم).
2. فكّك تفاصيله ذرّةً ذرّةً، وعلّل كل تفصيلة واربطها بما قبلها وبعدها حتى تكتمل الصورة ولا يبقى سؤال معلق.
3. مثال واقعي ملموس تفتتحه بـ (مثال:) وتشبيه حيّ يعلق بالذهن تفتتحه بـ (تشبيه:).
4. الرموز الرياضية والعلمية بصيغة LaTeX صحيحة للعرض الرياضي السليم: $...$ داخل السطر و $$...$$ للمعادلة المنفصلة (مثل $\\frac{1}{2}$ و $x^2$ و $\\sqrt{2}$)، والأهم أن المتغيرات والأرقام عربية بالكامل: أرقام (٠١٢٣٤٥٦٧٨٩) لا إنجليزية، ومتغيرات (س ص ع ن ك) لا (x y z)، وداخلة في \text{...} مثل $\\text{س}^{\\text{٣}}$، والقيمة المطلقة حصراً بـ \\lvert ...\\rvert$، والبراكيت (Ket) مثل \\lvert \\psi\\rangle داخل LaTeX فقط وليس | صريحة، والخط الرأسي | ممنوع في النص. لا تستخدم صيغة نصية مثل "2^3" أو "1/2".
5. استعمل Markdown غنياً بالعناوين الفرعية والفقرات والقوائم.
${isLast ? "6. هذا القسم الأخير: اختم بفقرة «خلاصة جامعة» لأدق تفاصيل الشرح كله، ثم سؤال تحفيزي واحد يدفع القارئ للتعمق بنفسه." : "6. هذا ليس ختام الشرح: لا تضع خاتمة عامة للدرس؛ أتمّ قسمك وانسحب بسلاسة."}

ابدأ ناتجك مباشرةً بعنوان القسم: "### ${title}" ثم الشرح الفوري بلا أي تحية أو مقدمة أو كلمة انتقالية علوية (قاعدة مطلقة).`;

    let partText = "";
    let partModel = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { response, modelUsed: pm } = await generateWithFallback(ai, {
          contents: partPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });
        partText = stripAssistantChatter(response.text || "").trim();
        partModel = pm;
        break;
      } catch (err) {
        if (attempt === 1) {
          console.warn(`[DeepDive] section ${displayIndex} failed:`, (err as any)?.message);
        }
      }
    }

    if (partText) {
      parts.push(partText);
      modelUsed = partModel || modelUsed;
    }
  }

  if (parts.length === 0) {
    const fallbackErr: any = new Error("فشل توليد الأقسام جميعها، سيتم اللجوء إلى التوليد المباشر.");
    fallbackErr.fallbackToSingleShot = true;
    throw fallbackErr;
  }

  const content = parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return { content, modelUsed: modelUsed || "" };
}

const CHATTER_PATTERNS: RegExp[] = [
  /أهلا؟ا?\s+ب\s+[ء-ي]+\s*/gi,
  /أهلا؟ا?\s+بك(م)?\s*/gi,
  /أهلا؟ا?\s+بيك\s*/gi,
  /مرحبا؟\s+ب\s+[ء-ي]+\s*/gi,
  /مرحبا؟\s+بك(م)?\s*/gi,
  /أهلًا وسهلًا\s*/gi,
  /السلام عليكم[^\n،.!]+\s*/gi,
  /وعليكم السلام/gi,
  /أنا مساعدك( \w+)*\s*/gi,
  /أنا (ك)?مساعد( ذكي)?\s*/gi,
  /أنا خبير[^\n.,!]+/gi,
  /بصفتي (مساعد|خبير)[^\n.]*/gi,
  /يسعدني (أن )?(أساعدك|مساعدتك)/gi,
];

function isChatterOpening(line: string): boolean {
  const t = line.replace(/^[>#*\-|]\s*/, "").trim();
  if (!t) return false;
  if (/^(أهلا|أهلاً|أهلًا|اهلا|مرحبا|مرحباً|السلام عليكم|عليكم السلام|يسعدني|تشرفت|حياك الله)\b/.test(t)) return true;
  if (/^(أنا (مساعد|كمساعد|خبير)|بصفتي)/i.test(t)) return true;
  if (/^(إليك|سأقدم|سوف أقدم|سأبدأ معك|دعني|دعنى)\b/i.test(t)) return true;
  if (/^(في هذا (الدرس|التلخيص|الشرح|الملخص|الموضوع)\s*(سأ|سوف|إليك|هذا))/i.test(t)) return true;
  if (/^(حاضر|بالتأكيد|طبعا|طبعاً|بكل سرور|بكل سعادة)[!،:.]/.test(t)) return true;
  return false;
}

// Remove assistant chatter (greetings, self-intros, intro transitions).
function stripAssistantChatter(text: string): string {
  if (!text) return text;
  let out = text;
  for (const pattern of CHATTER_PATTERNS) {
    out = out.replace(pattern, "");
  }
  const lines = out.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx >= 0 && isChatterOpening(lines[firstIdx])) {
    lines.splice(firstIdx, 1);
    while (lines[firstIdx] !== undefined && lines[firstIdx].trim() === "") {
      lines.splice(firstIdx, 1);
    }
    out = lines.join("\n");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// Deep-sanitize every string field inside a parsed JSON result.
function sanitizeTextFields(value: any): any {
  if (typeof value === "string") return stripAssistantChatter(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeTextFields(v));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = sanitizeTextFields(value[k]);
    return out;
  }
  return value;
}

function extractBase64AndMime(dataUrlOrBase64: string, fallbackMime = "application/pdf") {
  if (!dataUrlOrBase64) return { cleanBase64: "", mimeType: fallbackMime };

  const match = dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return {
      mimeType: match[1] || fallbackMime,
      cleanBase64: match[2],
    };
  }

  return {
    mimeType: fallbackMime,
    cleanBase64: dataUrlOrBase64,
  };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Endpoint: Split uploaded book / syllabus into structured units and lessons (supports text, images, and PDF files)
app.post("/api/gemini/split-book", async (req, res) => {
  try {
    const {
      bookTitle,
      subject,
      grade,
      content,
      pdfBase64,
      fileBase64,
      pdfFileName,
      fileName,
      fileMimeType,
      chunkIndex,
      totalChunks,
      startPage,
      endPage,
      previousUnitsContext,
    } = req.body;

    const rawFile = fileBase64 || pdfBase64;
    const effectiveFileName = fileName || pdfFileName || "";
    const effectiveTitle =
      bookTitle?.trim() ||
      (effectiveFileName
        ? effectiveFileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
        : "") ||
      "المقرر الدراسي";

    if (!effectiveTitle && !effectiveFileName) {
      return res.status(400).json({
        error: "يرجى تزويد عنوان الكتاب أو رفع ملف.",
      });
    }

    if (!content && !rawFile) {
      return res.status(400).json({
        error: "يرجى كتابة محتوى الكتاب أو رفع ملف PDF أو صورة للفهرس.",
      });
    }

    const ai = getGeminiClient();

    let cleanData: string | undefined = undefined;
    let mime = fileMimeType || "application/pdf";

    if (rawFile && typeof rawFile === "string") {
      const extracted = extractBase64AndMime(rawFile, mime);
      cleanData = extracted.cleanBase64;
      mime = extracted.mimeType;
    }

    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf" || mime.includes("pdf");
    const isMultiChunk = typeof totalChunks === "number" && totalChunks > 1;

    const prompt = `أنت خبير تربوي ومصمم مناهج دراسية محترف ومطور محتوى تعليمي معتمد.
المهمة: ${
      isMultiChunk
        ? `أنت تقوم الآن بالتحليل المتسلسل الشامل للكتاب عبر عدة أجزاء. هذا هو الجزء (${(chunkIndex ?? 0) + 1} من إجمالي ${totalChunks} أجزاء)، ويغطي الصفحات من ${startPage || 1} إلى ${endPage || "نهاية الجزء"}. المطلوب استخراج الوحدات والدروس الواردة في هذا الجزء تحديداً بتسلسل وترتيب منهجي متصل.`
        : cleanData
        ? isPdf
          ? "قم بقراءة وتحليل ملف الـ PDF المرفق لهذا الكتاب أو المقرر الدراسي بدقة متناهية، وافحص الفهرس والأبواب والفصول والمحتوى، ثم قسمه إلى وحدات دراسية (Units) ودروس (Lessons) متسلسلة ومنطقية وشاملة للمنهج."
          : isImage
          ? "قم بفحص وقراءة صورة فهرس/صفحات الكتاب المرفقة بدقة متناهية، واستخرج منها الوحدات الدراسية (Units) والدروس (Lessons) المتسلسلة."
          : "قم بتحليل محتوى هذا الملف وتقسيمه إلى وحدات دراسية ودروس متسلسلة."
        : "قم بتحليل محتوى هذا الكتاب أو المقرر الدراسي وتقسيمه إلى وحدات دراسية (Units) ودروس (Lessons) متسلسلة ومنطقية."
    }

بيانات الكتاب:
- العنوان: "${effectiveTitle}"
${subject ? `- المادة: "${subject}"` : ""}
${grade ? `- المرحلة / الصف: "${grade}"` : ""}
${
  isMultiChunk
    ? `\n--- تفاصيل التسلسل والربط بين أجزاء الكتاب ---
- الجزء الحالي: رقم ${(chunkIndex ?? 0) + 1} من أصل ${totalChunks} أجزاء متتالية.
- نطاق الصفحات في هذا الملف: من صفحة ${startPage} إلى صفحة ${endPage}.
${
  Array.isArray(previousUnitsContext) && previousUnitsContext.length > 0
    ? `- قائمة الوحدات المستخرجة من الأجزاء السابقة:\n${previousUnitsContext.map((u: string) => `  * ${u}`).join("\n")}
- قاعدة هامة للربط المتسلسل: إذا كانت الدروس الواردة في هذا الجزء تكملة أو تابعة لإحدى الوحدات المذكورة أعلاه، استخدم نفس اسم الوحدة تماماً لتُضاف الدروس إليها بتسلسل متصل. أما إذا بدأ هذا الجزء بوحدة دراسية جديدة، فأنشئ اسم الوحدة الجديدة بدقة.`
    : "- هذا هو الجزء الأول من الكتاب، ابدأ باستخراج الوحدات والدروس الأولى منه."
}`
    : ""
}
${
  content
    ? `- نص أو توجيهات إضافية من المعلم:\n"""\n${content.slice(0, 45000)}\n"""`
    : ""
}

المطلوب بدقة:
1. قسم محتوى هذا ${isMultiChunk ? `الجزء (الصفحات ${startPage} إلى ${endPage})` : "المقرر"} إلى وحدات دراسية واضحة ومترابطة.
2. في كل وحدة، استخرج الدروس التابعة لها بتسلسل منطقي.
3. لكل درس، استخرج أو لخص نص المحتوى العلمي الأولي التابع له (بين 3 إلى 5 فقرات وافية وغنية بالمفاهيم والمصطلحات والأنشطة المستخلصة من الكتاب أو الملف).
4. حدد الكلمات المفتاحية الأساسية والزمن التقديري للحصة (مثلاً 45 دقيقة).

أعد النتيجة بصيغة JSON حصراً مطابقة تماماً للمخطط التالي:
{
  "bookSummary": "نبذة موجزة وشاملة عن الكتاب أو هذا الجزء",
  "units": [
    {
      "unitTitle": "عنوان الوحدة",
      "lessons": [
        {
          "title": "عنوان الدرس",
          "summary": "ملخص سريع للدرس في سطرين إلى ثلاثة أسطر",
          "estimatedDuration": "45 دقيقة",
          "keyKeywords": ["مفهوم 1", "مفهوم 2", "مفهوم 3"],
          "content": "المحتوى العلمي والتفاصيل الأساسية للدرس المستخرجة من الكتاب أو الملف"
        }
      ]
    }
  ]
}`;

    const contents: any = cleanData
      ? [
          {
            inlineData: {
              mimeType: mime,
              data: cleanData,
            },
          },
          prompt,
        ]
      : prompt;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = sanitizeTextFields(cleanAndParseJson(response.text));
    return res.json({ ...parsed, modelUsed });
  } catch (error: any) {
    console.error("Error in split-book:", error);
    return res.status(500).json({
      error:
        error?.message ||
        "حدث خطأ أثناء تقسيم وتحليل الكتاب بالذكاء الاصطناعي. يُرجى المحاولة مرة أخرى.",
    });
  }
});

// Endpoint: Generate specialized content for one of the 10 tabs
function buildTabSpec(body: any, opts?: { noSequential?: boolean }) {
  const {
    tabType,
    lessonTitle,
    unitTitle,
    bookTitle,
    lessonContent,
    customPrompt,
    tone = "academic",
    pdfBase64,
  } = body;

  const ai = getGeminiClient();

  let systemInstruction = "أنت مساعد تربوي وخبير تعليمي ذكي متميز في تحضير وتطوير المحتوى الدراسي. قاعدة صارمة وأولوية قصوى: أخرج المحتوى النهائي مباشرةً دون أي تحية أو ترحيب أو مقدمة افتتاحية، دون تقديم نفسك، دون مناداة المستخدم بالاسم أو بلفظة (يا). أول ما تُخرجه يجب أن يكون محتوى التبويب نفسه.";
  let promptInstruction = "";
  let responseMimeType: string | undefined = undefined;
  let sequential = false;

  const baseContext = `

كتاب: "${bookTitle || "المقرر الدراسي"}"
الوحدة: "${unitTitle || "الوحدة"}"
الدرس: "${lessonTitle}"
نص ومحتوى الدرس:
"""
${(lessonContent || "").slice(0, 25000) || "لا يوجد نص مفصل متاح، اعتمد على موضوع الدرس وعنوانه لإعداد محتوى أكاديمي ثري وشامل."}
"""
${customPrompt ? `ملاحظات إضافية من المعلم: "${customPrompt}"` : ""}
`;

    switch (tabType) {
      case "summary":
        promptInstruction = `
قم بإعداد "تلخيص شامل ومركز" لهذا الدرس يتضمن:
1. الفكرة المركزية وزبدة الدرس.
2. ملخص للأقسام والمحاور الرئيسية بأسلوب بليغ وسلس.
3. أبرز النتائج والمخرجات التعليمية المستفادة.
4. جدول أو قائمة بأهم النقاط الذهبية السريعة للمراجعة قبل الامتحان.
استخدم تنسيق Markdown منظم جداً وعناوين واضحة ورموز نقطية وألوان دلالية.
`;
        break;

      case "bulletPoints":
        promptInstruction = `
قم بـ "تفريغ الدرس على هيئة نقاط مرتبة ومحددة بدقة":
1. قسم النقاط إلى مجموعات موضوعية حسب أفكار الدرس.
2. اجعل كل نقطة محددة ومباشرة، وتحتوي على معلومة أو حقيقة مركزة (تجنب الإطناب والغموض).
3. أضف وسم [حقيقة هامة] أو [معلومة محورية] أو [قاعدة ذهبية] أمام النقاط الأساسية.
4. ضع قائمة ختامية بعنوان: "نقاط المراجعة السريعة في 60 ثانية".
`;
        break;

      case "mindMap":
        responseMimeType = "application/json";
        promptInstruction = `
قم بإنشاء "خريطة ذهنية شجرية وهيكلية تفاعلية" (Interactive Mind Map) لهذا الدرس.
يجب أن ترجع الناتج كـ JSON حصراً بالهيكل التالي:
{
  "centerTopic": "${lessonTitle}",
  "description": "وصف موجز للموضوع المركزي",
  "branches": [
    {
      "id": "b1",
      "title": "الفرع الرئيسي الأول",
      "color": "emerald",
      "subBranches": [
        {
          "id": "sb1-1",
          "title": "نقطة فرعية",
          "details": "شرح مقتضب أو أمثلة"
        }
      ]
    }
  ]
}
اختر من 3 إلى 6 فروع رئيسية تغطي كافة جوانب الدرس، ولكل فرع من 2 إلى 4 فروع فرعية بتفاصيل واضحة.
`;
        break;

      case "lessonPlan":
        promptInstruction = `
قم بإعداد "دفتر تحضير درس نموذجي واحترافي للمعلم" وفق أحدث المعايير التربوية:
1. بيانات الدرس: (الصف، المادة، زمن الحصة: 45 دقيقة، استراتيجيات التدريس المقترحة).
2. الأهداف السلوكية الإجرائية مقسمة إلى:
   - الأهداف المعرفية (أن يذكر، أن يفسر، أن يقارن...)
   - الأهداف المهارية (أن يطبق، أن يحلل، أن يحل مسألة...)
   - الأهداف الوجدانية والقيمية (أن يقدّر، أن يتعاون...).
3. التمهيد والتهيئة الحافزة (Ice breaker / Starter activity) لشد انتباه الطلاب (5 دقائق).
4. سير الدرس وخطة التنفيذ خطوة بخطوة مع توزيع زمني دقيق لكل نشاط ومهمة.
5. الوسائل والتقنيات التعليمية المستخدمة.
6. التقويم التكويني والأسئلة الشفوية أثناء الشرح.
7. الغلق والتقويم الختامي (Summative Assessment).
8. الواجب المنزلي والتكليفات الإثرائية وعلاج الضعف.
استخدم تنسيق Markdown راقي مع جداول واضحة.
`;
        break;

      case "quiz":
        responseMimeType = "application/json";
        promptInstruction = `
أنشئ "بنك أسئلة واختبار تفاعلي متكامل" لهذا الدرس يقيس مستويات الفهم المختلفة (تذكر، فهم، تطبيق، تحليل).
أعد الناتج كـ JSON حصراً بالهيكل التالي:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "نص سؤال اختيار من متعدد؟",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctIndex": 0,
      "explanation": "تفسير علمي دقيق لسبب صحة هذه الإجابة"
    },
    {
      "id": "q5",
      "type": "true_false",
      "question": "نص عبارة صح أم خطأ؟",
      "correctBoolean": true,
      "explanation": "تفسير صحة أو خطأ العبارة"
    },
    {
      "id": "q8",
      "type": "essay",
      "question": "سؤال مقالي أو استنتاجي؟",
      "modelAnswer": "الإجابة النموذجية المرجوة من الطالب"
    }
  ]
}
قم بتوليد ما لا يقل عن 6 أسئلة اختيار من متعدد، و 4 أسئلة صح وخطأ، و 2 أسئلة مقالية.
`;
        break;

      case "glossary":
        responseMimeType = "application/json";
        promptInstruction = `
أنشئ "معجم المفاهيم والمصطلحات العلمية واللغوية" لهذا الدرس.
أعد الناتج كـ JSON حصراً بالهيكل التالي:
{
  "terms": [
    {
      "term": "المصطلح أو المفهوم",
      "category": "تصنيف (مثل: مفهوم فيزيائي، قاعدة لغوية، حدث تاريخي...)",
      "definition": "تعريف علمي دقيق وشامل بلغة واضحة وبسيطة",
      "example": "مثال تطبيقي أو واقعي يوضح المصطلح",
      "commonMistake": "خطأ شائع يقع فيه الطلاب حول هذا المصطلح وكيفية تجنبه"
    }
  ]
}
استخرج من 5 إلى 10 مصطلحات محورية في الدرس.
`;
        break;

      case "activities":
        promptInstruction = `
قم بإعداد "دليل الأنشطة الصفية والمشاريع التطبيقية" لهذا الدرس:
1. نشاط صفي استكشافي جماعي (Hands-on group activity) مع الأدوات المطلوبة وخطوات التنفيذ وأسلوب تقييم المجموعات.
2. نشاط صفي فردي سريع (التفكير والمشاركة مع الزميل Think-Pair-Share).
3. مشروع تكليفي تطبيقي (Mini Project) يربط الدرس بالعالم الحقيقي والحياة اليومية.
4. تجربة عملية أو محاكاة رقمية أو نشاط تفاعلي إن وجد.
5. سلم تقييم (Rubric) مبسط لتقييم أداء الطلاب في النشاط.
استخدم تنسيق Markdown منظم مع خطوات عملية قابلة للتطبيق الفعلي في الفصل.
`;
        break;

      case "flashcards":
        responseMimeType = "application/json";
        promptInstruction = `
أنشئ "بطاقات استذكار سريعة وفلاش كاردز (Flashcards)" لمراجعة وحفظ مفاهيم وحقائق هذا الدرس.
أعد الناتج كـ JSON حصراً بالهيكل التالي:
{
  "cards": [
    {
      "id": "fc1",
      "front": "السؤال أو المفهوم أو المسألة في الوجه الأمامي للبطاقة",
      "back": "الإجابة الشافية أو الشرح الموجز المركز في الوجه الخلفي",
      "hint": "تلميح ذكي لمساعدة الطالب قبل قلب البطاقة",
      "category": "تصنيف فرعي (مثل: تعريف، قانون، تاريخ، تعليل)"
    }
  ]
}
قم بإنشاء بين 8 إلى 12 بطاقة استذكار ممتازة ومتنوعة.
`;
        break;

      case "criticalThinking":
        promptInstruction = `
قم بصياغة "أسئلة وتحديات التفكير الناقد وحل المشكلات" المرتبطة بمحتوى الدرس:
1. أسئلة التفكير العليا وفق تصنيف بلوم (التحليل، التركيب، التقويم).
2. سيناريوهات ومواقف واقعية: "دراسة حالة وحل مشكلة" (Case Study) تطلب من الطالب تطبيق ما تعلمه.
3. أسئلة الافتراضات والتخيل العلمي: "ماذا لو حدث كذا وكذا؟".
4. موضوع مناظرة صفية (Debate topic) ذو وجهتي نظر مع حجج مؤيدة ومعارضة.
5. توجيهات للمعلم حول كيفية إدارة النقاش وتحفيز الطلاب على التفكير المستقل وتجنب التلقين.
`;
        break;

      case "simplifiedExplanation":
        promptInstruction = `
قم بتقديم "شرح مبسط للغاية وتشبيهات واقعية" للدرس بأسلوب (Explain Like I'm 12 / تبسيط العلوم والأفكار):
1. مقدمة مشوقة تبدأ بسؤال مدهش أو حكاية قصيرة تجذب القارئ.
2. تشبيه ذكي من واقع الحياة اليومية يبسط المفهوم المعقد (مثال: تشبيه التيار الكهربائي بخرطوم المياه، أو تشبيه الخلية بمصنع به عمال ومدير).
3. قصة قصيرة أو حوار طريف يرسخ الفكرة في الذاكرة.
4. "الأخطاء الشائعة والبديهيات الخاطئة": ما الذي يظنه معظم الناس خطأً وما هو الصواب؟
5. الخلاصة بعبارة واحدة ذكية تعلق بالذهن.
`;
        break;

      case "teacherBriefing":
        promptInstruction = `
قم بإعداد "بطاقة إحاطة المعلم الشاملة قبل الحصة" لهذا الدرس، وهي مرجع مكثف يقرؤه المعلم في 5 دقائق ليصبح ملمّاً بكل تفاصيل الدرس ويشرحه بثقة وسلاسة. يجب أن تتضمن البطاقة الأقسام التالية ذات العناوين الكبيرة التالية (متطابقة حرفياً):
1. ## الزبدة في سطرين
2. ## المفاهيم الحرجة والمفاتيح
3. ## المفاهيم الخاطئة الشائعة عند الطلاب
4. ## تسلسل الشرح المقترح خطوة بخطوة
5. ## روابط الدرس مع وحدات ودروس أخرى
6. ## أسئلة الامتحان المتوقعة وإجاباتها النموذجية
7. ## حوار صفّي: أسئلة سقراطية جاهزة
محتوى كل قسم:
- الزبدة في سطرين: جوهر الدرس بلغة لا تتجاوز سطرين.
- المفاهيم الحرجة: قائمة نقطية بأهم المفاهيم التي يرتكز عليها الدرس ولماذا يسهل أن يخطئ الطالب في فهمها.
- المفاهيم الخاطئة الشائعة: عن كل مفهوم خاطئ: العبارة الخاطئة، ثم التصحيح العلمي الصحيح.
- تسلسل الشرح: ترتيب تطبيقي مقترح لتقديم أجزاء الدرس (تمهيد، ثم خطوات) مع تلميح انتقال لكل خطوة.
- روابط الدرس: ربط المحتوى بمواضيع سابقة أو لاحقة في المنهاج لتعزيز التعلم المترابط.
- أسئلة الامتحان المتوقعة: 3 أسئلة شائعة (سؤال وصح وخطأ ومقالي إن وُجد) مع الإجابة النموذجية المختصرة تحت كل سؤال.
- حوار صفّي: 5 أسئلة سقراطية متنوعة: (لماذا؟، كيف؟، ماذا لو؟، قارن بين...، أعط مثالاً مضاداً...) بأسلوب يحفز التفكير.
التنسيق: Markdown منظم بتلك العناوين السبعة حصراً، بدون عنوان افتتاحي إضافي، وبأسلوب مكثف دقيق لا شرح مطول.
`;
        break;

      case "deepDive":
        if (!pdfBase64 && !opts?.noSequential) {
          sequential = true;
          promptInstruction = DEEP_DIVE_FULL_PROMPT;
        } else {
          promptInstruction = DEEP_DIVE_FULL_PROMPT;
        }
        break;

      default:
        promptInstruction = `قم بتحليل وإثراء محتوى هذا الدرس بشكل تربوي شامل.`;
        break;
    }

    const fullPrompt = `${baseContext}\n\n${promptInstruction}\n\n${NO_CHATTER_RULE}\n\n${MATH_RULE}`;

    const config: any = {
      systemInstruction,
      temperature: 0.4,
    };

    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }

    let cleanTabPdfBase64: string | undefined = undefined;
    let tabMime = "application/pdf";
    if (pdfBase64 && typeof pdfBase64 === "string") {
      const extracted = extractBase64AndMime(pdfBase64, tabMime);
      cleanTabPdfBase64 = extracted.cleanBase64;
      tabMime = extracted.mimeType;
    }

    const contents: any = cleanTabPdfBase64
      ? [
          {
            inlineData: {
              mimeType: tabMime,
              data: cleanTabPdfBase64,
            },
          },
          fullPrompt,
        ]
      : fullPrompt;

    return {
      ai,
      tabType,
      lessonTitle,
      systemInstruction,
      baseContext,
      responseMimeType,
      fullPrompt,
      config,
      contents,
      sequential,
    };
  }

  app.post("/api/gemini/generate-tab", async (req, res) => {
    try {
      if (!req.body?.tabType || !req.body?.lessonTitle) {
        return res.status(400).json({
          error: "يرجى تحديد نوع التبويب وعنوان الدرس.",
        });
      }

      let spec = buildTabSpec(req.body);

      if (spec.sequential) {
        try {
          const merged = await generateDeepDiveSequentialServer({
            ai: spec.ai,
            systemInstruction: spec.systemInstruction,
            baseContext: spec.baseContext,
            customPrompt: req.body.customPrompt,
          });
          return res.json({
            success: true,
            tabType: spec.tabType,
            format: "markdown",
            content: merged.content,
            modelUsed: merged.modelUsed,
          });
        } catch (err: any) {
          if (!err?.fallbackToSingleShot) throw err;
          spec = buildTabSpec(req.body, { noSequential: true });
        }
      }

      const { response, modelUsed } = await generateWithFallback(spec.ai, {
        contents: spec.contents,
        config: spec.config,
      });

      const { tabType, responseMimeType } = spec;
      } catch (error: any) {
    console.error("Error in generate-tab:", error);
    return res.status(500).json({
      error: error?.message || "فشل توليد المحتوى بواسطة الذكاء الاصطناعي. يُرجى المحاولة مرة أخرى.",
    });
  }
});

// Endpoint: Stream generated tab content progressively (Server-Sent Events)
app.post("/api/gemini/generate-tab-stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (data: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* ignore */
    }
  };
  try {
    if (!req.body?.tabType || !req.body?.lessonTitle) {
      send({ error: "يرجى تحديد نوع التبويب وعنوان الدرس." });
      return res.end();
    }
    let spec = buildTabSpec(req.body);

    if (spec.sequential) {
      try {
        const merged = await generateDeepDiveSequentialServer({
          ai: spec.ai,
          systemInstruction: spec.systemInstruction,
          baseContext: spec.baseContext,
          customPrompt: req.body.customPrompt,
        });
        send({
          done: true,
          tabType: spec.tabType,
          format: "markdown",
          content: merged.content,
          rawText: merged.content,
          modelUsed: merged.modelUsed,
        });
        return res.end();
      } catch (err: any) {
        if (!err?.fallbackToSingleShot) throw err;
        spec = buildTabSpec(req.body, { noSequential: true });
      }
    }

    const { stream: streamResp, modelUsed } = await streamWithFallback(
      spec.ai,
      spec.contents,
      spec.config
    );

    let acc = "";
    for await (const chunk of streamResp) {
      const text = (chunk as any).text || "";
      if (text) {
        acc += text;
        send({ delta: text, text: acc });
      }
    }

    const isJson = spec.responseMimeType === "application/json";
    if (isJson) {
      try {
        const parsedJson = sanitizeTextFields(cleanAndParseJson(acc));
        send({
          done: true,
          tabType: spec.tabType,
          format: "json",
          data: parsedJson,
          rawText: acc,
          modelUsed,
        });
      } catch {
        send({
          done: true,
          tabType: spec.tabType,
          format: "markdown",
          content: stripAssistantChatter(acc),
          rawText: acc,
          modelUsed,
        });
      }
    } else {
      send({
        done: true,
        tabType: spec.tabType,
        format: "markdown",
        content: stripAssistantChatter(acc),
        rawText: acc,
        modelUsed,
      });
    }
    res.end();
  } catch (error: any) {
    console.error("Error in generate-tab-stream:", error);
    try {
      send({ error: error?.message || "فشل التوليد التدريجي بواسطة الذكاء الاصطناعي." });
    } catch {
      /* ignore */
    }
    res.end();
  }
});

// Endpoint: Explain highlighted/selected snippet from any tab and return pedagogical explanation
app.post("/api/gemini/explain-selection", async (req, res) => {
  try {
    const {
      selectedText,
      lessonTitle,
      unitTitle,
      bookTitle,
      tabType,
      tabTitle,
      lessonContent,
      customInstruction,
    } = req.body;

    if (!selectedText || !selectedText.trim()) {
      return res.status(400).json({ error: "يرجى تحديد أو تظليل نص لشرحه." });
    }

    const ai = getGeminiClient();

    const prompt = `أنت خبير تربوي وموضح مفاهيم تعليمية متميز في تبسيط وشرح المقررات الدراسية.
قام المعلم بتظليل هذا الجزء من المحتوى التعليمي وطلب شرحه وتوضيحه بعمق وبأسلوب تعليمي شيق:

📌 الجزء المحدد المطلوب شرحه:
«${selectedText.trim()}»

بيانات السياق التعليمي:
- المقرر/الكتاب: "${bookTitle || "المقرر الدراسي"}"
- الوحدة الدراسية: "${unitTitle || "الوحدة"}"
- عنوان الدرس: "${lessonTitle || "الدرس"}"
${tabTitle ? `- التبويب المأخوذ منه: "${tabTitle}"` : ""}
${lessonContent ? `- سياق محتوى الدرس:\n"""\n${lessonContent.slice(0, 4000)}\n"""` : ""}
${customInstruction ? `- توجيه أو طلب خاص من المعلم: "${customInstruction}"` : ""}

المطلوب بدقة:
1. تقديم شرح علمي دقيق وواضح جداً لهذا الجزء المحدد.
2. تفكيك المفاهيم والمصطلحات الصعبة الواردة فيه وتبسيطها للطلاب.
3. إعطاء مثال واقعي أو تطبيقي أو تشبيه تعليمي يرسخ الفكرة في ذهن المتعلم.
4. صياغة الإجابة بتنسيق Markdown راقٍ ومنظم يبدأ مباشرة بعنوان توضيحي جذاب، متبوعاً بالشرح في نقاط وفقرات قصيرة وسلسة دون مقدمات مطولة.`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: "أنت معلم متميز وخبير بيداغوجي متخصص في شرح وتوضيح المفاهيم الدراسية المحددة للطلاب بأسلوب تعليمي مبسط وممتع. قاعدة صارمة: ابدأ الشرح مباشرة بالعنوان والمحتوى دون أي تحية أو ترحيب أو تقديم للنفس.",
        temperature: 0.3,
      },
    });

    const explanation = stripAssistantChatter(response.text || "");
    return res.json({
      success: true,
      explanation,
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in explain-selection:", error);
    return res.status(500).json({
      error: error?.message || "فشل شرح الجزء المحدد بواسطة الذكاء الاصطناعي. يُرجى المحاولة مرة أخرى.",
    });
  }
});

// Endpoint: Generate socratic discussion questions for a slide / chunk during class
app.post("/api/gemini/socratic-questions", async (req, res) => {
  try {
    const { slideText, lessonTitle } = req.body;
    if (!slideText || !slideText.trim()) {
      return res.status(400).json({ error: "يرجى تزويد نص الشريحة." });
    }

    const ai = getGeminiClient();
    const prompt = `أنت معلم متمرس في إدارة الحوار الصفي السقراطي.
مقطع من شرح المعلم أمام الطلاب (من درس: "${lessonTitle || "الدرس"}"):
«${slideText.slice(0, 3000)}»

المطلوب: توليد 5 أسئلة حوار صفّي سقراطية متنوعة تحفز التفكير العميق لدى الطلاب، موزعة على الأنواع:
- سؤال (لماذا؟) يبحث في السبب
- سؤال (كيف؟) يبحث في الآلية
- سؤال (ماذا لو؟) للاستدلال الإبداعي
- سؤال (قارن بين / صنّف)
- سؤال (أعط مثالاً مضاداً / اكتشاف خطأ)

أعد الناتج كـ JSON حصراً بالهيكل:
{
  "questions": ["السؤال الأول", "السؤال الثاني", "السؤال الثالث", "السؤال الرابع", "السؤال الخامس"]
}
لكل سؤال صياغة جذابة قصيرة ومباشرة بلغة عربية فصيحة، بدون أي مقدمات ولا شروح.`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    const parsed = sanitizeTextFields(cleanAndParseJson(response.text));
    return res.json({
      success: true,
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in socratic-questions:", error);
    return res.status(500).json({
      error: error?.message || "فشل توليد أسئلة الحوار.",
    });
  }
});

// Endpoint: Turn a highlighted chunk into a ready-to-use exam question instantly
app.post("/api/gemini/generate-question", async (req, res) => {
  try {
    const { selectedText, lessonTitle, questionType } = req.body;
    if (!selectedText || !selectedText.trim()) {
      return res.status(400).json({ error: "يرجى تحديد النص لتحويله إلى سؤال." });
    }

    const ai = getGeminiClient();
    const typeInstruction = {
      mcq: "أنشئ سؤال اختيار من متعدد",
      true_false: "أنشئ سؤال صح وخطأ",
      essay: "أنشئ سؤالاً مقالياً أو استنتاجياً",
    }[questionType as string] || "أنشئ سؤال اختيار من متعدد (بشكل افتراضي)";

    const prompt = `أنت خبير في بناء أسئلة الامتحانات التربوية.
${typeInstruction} من النص الآتي (المأخوذ من درس: "${lessonTitle || "الدرس"}"):
«${selectedText.slice(0, 2000)}»

أعد الناتج كـ JSON حصراً بالهيكل المناسب لنوع السؤال:
- للاختيار من المتعدد:
{ "type": "mcq", "question": "نص السؤال", "options": ["أ", "ب", "ج", "د"], "correctIndex": 0, "explanation": "تفسير سبب صحة الإجابة" }
- للصح والخطأ:
{ "type": "true_false", "question": "عبارة صح أم خطأ", "correctBoolean": true, "explanation": "تفسير الصحة أو الخطأ" }
- للمقالي:
{ "type": "essay", "question": "السؤال المقالي", "modelAnswer": "الإجابة النموذجية الموجزة" }
قاعدة: سؤال واحد فقط، واضح ومحكم، بلغة عربية فصيحة، بدون مقدمات أو كلام خارج JSON.`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = sanitizeTextFields(cleanAndParseJson(response.text));
    return res.json({
      success: true,
      question: parsed,
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in generate-question:", error);
    return res.status(500).json({
      error: error?.message || "فشل توليد السؤال من النص المحدد.",
    });
  }
});

// Endpoint: Generate a full semester plan for a book
app.post("/api/gemini/generate-plan", async (req, res) => {
  try {
    const { bookTitle, subject, grade, weeksCount, termLabel, lessons } = req.body;
    if (!bookTitle || !Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: "بيانات المقرر والدروس مطلوبة لتوليد الخطة." });
    }

    const ai = getGeminiClient();
    const lessonsList = lessons
      .map(
        (l: any, i: number) =>
          `${i + 1}. (${l.unitTitle || ""}) ${l.title}${l.duration ? ` — الزمن: ${l.duration}` : ""}`
      )
      .join("\n");

    const prompt = `أنت مخطط مناهج وخبير تربوي متميز في بناء الخطط الفصلية الدراسية وفق معايير التخطيط السنوي الاحترافية.
المادة: "${subject || ""}" — الصف/المرحلة: "${grade || ""}" — المقرر: "${bookTitle}"
الفصل الدراسي: "${termLabel || "الفصل الدراسي الأول"}" — المدة المطلوبة: ${weeksCount} أسبوعاً دراسياً.

دروس المقرر بالترتيب:
${lessonsList}

أعد "الخطة الفصلية" كـ JSON حصراً بالهيكل التالي:
{
  "planTitle": "عنوان الخطة الفصلية",
  "weeks": [
    {
      "week": 1,
      "title": "عنوان الأسبوع",
      "lessons": ["أسماء الدروس المقرر تدريسها في هذا الأسبوع"],
      "objectives": ["أهداف التعلم الأساسية للأسبوع"],
      "activities": ["أنشطة صفية ومشاريع وتقييمات مقترحة"],
      "homework": ["تكليفات وواجبات منزلية"]
    }
  ]
}
القواعد:
1. وزّع جميع دروس المقرر على الأسابيع ${weeksCount} بتوازن معقول، بحيث تُغطى كل الدروس دون نقص.
2. عدد الأسابيع يجب أن يساوي ${weeksCount} حرفياً (من 1 إلى ${weeksCount}).
3. اجعل "lessons" في كل أسبوع أسماء حرفية مطابقة لأسماء الدروس أعلاه، وأضف أسابيع مراجعة وامتحانات عند الحاجة مع الإبقاء على التوزيع واقعياً.
4. كل القيم بلغة عربية فصيحة واضحة، بدون مقدمات أو كلام خارج JSON.
5. استخدم إجمالي عدد الدروس (${lessons.length}) في التوزيع.`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    const parsed = sanitizeTextFields(cleanAndParseJson(response.text));
    if (!parsed?.weeks || !Array.isArray(parsed.weeks)) {
      throw new Error("لم يتمكن النموذج من بناء الخطة. أعد المحاولة.");
    }
    return res.json({ success: true, plan: parsed, modelUsed });
  } catch (error: any) {
    console.error("Error in generate-plan:", error);
    return res.status(500).json({
      error: error?.message || "فشل توليد الخطة الفصلية.",
    });
  }
});

// Endpoint: Extract rich lesson content from an uploaded PDF worksheet or chapter
app.post("/api/gemini/extract-lesson-pdf", async (req, res) => {
  try {
    const { pdfBase64, fileBase64, lessonTitle, bookTitle, fileMimeType } = req.body;
    const rawFile = fileBase64 || pdfBase64;

    if (!rawFile) {
      return res.status(400).json({ error: "يرجى تزويد ملف PDF أو صورة للدرس." });
    }

    const ai = getGeminiClient();
    let mime = fileMimeType || "application/pdf";
    const extracted = extractBase64AndMime(rawFile, mime);
    const cleanData = extracted.cleanBase64;
    mime = extracted.mimeType;

    const prompt = `أنت خبير تربوي ومحرر مناهج تعليمية متميز.
قم بقراءة وتحليل الملف المرفق الخاص بدرس: "${lessonTitle || "الدرس المرفق"}" من كتاب "${bookTitle || "المقرر"}".
المطلوب:
استخراج وصياغة محتوى تعليمي مفصل وواضح وشامل للدرس من صفحات الملف، يشمل:
1. المفاهيم والمصطلحات الأساسية بدقة.
2. الشرح التفصيلي للفقرات والنقاط الجوهرية.
3. الأمثلة والتطبيقات والقوانين أو الشواهد الواردة في الملف.
4. ملخص ختامي في سطرين أو ثلاثة أسطر.

أعد النتيجة بصيغة JSON حصراً بالهيكل التالي:
{
  "summary": "ملخص موجز للدرس في سطرين أو ثلاثة أسطر",
  "content": "المحتوى التفصيلي الكامل بصيغة نصية واضحة ومنظمة بأسلوب أكاديمي شائق"
}`;

    const { response, modelUsed } = await generateWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: mime,
            data: cleanData,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = sanitizeTextFields(cleanAndParseJson(response.text));
    return res.json({
      success: true,
      summary: parsed.summary || "",
      content: parsed.content || "",
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in extract-lesson-pdf:", error);
    return res.status(500).json({
      error: error?.message || "فشل استخراج محتوى الدرس من ملف PDF.",
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`محضر الدروس - Server running on http://localhost:${PORT}`);
  });
}

startServer();
