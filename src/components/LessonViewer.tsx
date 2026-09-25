import React, { useRef, useState, useEffect, useImperativeHandle } from "react";
import { Lesson, Book, TabId, TabContentRecord, QuizQuestion } from "../types";
import { TABS_CONFIG } from "../data/tabs";
import { generateTabWithAI, extractLessonFromPdf } from "../services/ai";
import { optimizeFileForUpload } from "../utils/fileOptimizer";
import {
  Sparkles,
  Loader2,
  FileText,
  ListChecks,
  Network,
  ClipboardList,
  HelpCircle,
  BookOpen,
  Layers,
  Lightbulb,
  Smile,
  GraduationCap,
  Compass,
  MonitorPlay,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Edit3,
  Clock,
  Tag,
  CheckCircle2,
  AlertCircle,
  Share2,
  UploadCloud,
  Volume2,
  VolumeX,
} from "lucide-react";

// Tab Renderers
import { TabRendererSummary } from "./tabs/TabRendererSummary";
import { TabRendererBulletPoints } from "./tabs/TabRendererBulletPoints";
import { TabRendererMindMap } from "./tabs/TabRendererMindMap";
import { TabRendererLessonPlan } from "./tabs/TabRendererLessonPlan";
import { TabRendererQuiz } from "./tabs/TabRendererQuiz";
import { TabRendererGlossary } from "./tabs/TabRendererGlossary";
import { TabRendererActivities } from "./tabs/TabRendererActivities";
import { TabRendererFlashcards } from "./tabs/TabRendererFlashcards";
import { TabRendererCriticalThinking } from "./tabs/TabRendererCriticalThinking";
import { TabRendererSimplified } from "./tabs/TabRendererSimplified";
import { TabRendererDeepDive } from "./tabs/TabRendererDeepDive";
import { TabRendererTeacherBriefing } from "./tabs/TabRendererTeacherBriefing";
import { MathMarkdown } from "./MathMarkdown";
import { ExportTabMenu } from "./ExportTabMenu";
import { PresentMode } from "./PresentMode";
import { TabSelectionExplainer } from "./TabSelectionExplainer";
import { TabExplanationsList } from "./TabExplanationsList";
import { speak, stopSpeaking, speechSupported, jsonTabToSpeech } from "../utils/tts";
import { maybeShowInterstitial } from "../utils/ads";

function containsLaTeXMath(text: string): boolean {
  return (
    /\$\$[\s\S]+?\$\$/.test(text) ||
    /\$[^$\n]+?\$/.test(text) ||
    /\\\\(frac|dfrac|sqrt|sum|int|lim|pi|Delta|times|cdot|vec|binom|le|ge|neq|infty)\b/.test(text)
  );
}

export interface LessonViewerHandle {
  generateAllMissing: () => Promise<{
    generated: number;
    failed: number;
    total: number;
  }>;
}

interface Props {
  lesson: Lesson;
  book: Book;
  onSaveTabContent: (tabId: TabId, record: TabContentRecord) => Promise<void>;
  onUpdateLessonContent: (newContent: string) => Promise<void>;
  activeTabId?: TabId;
  onSelectTabId?: (tabId: TabId) => void;
  onOpenToolsSheet?: () => void;
  onNextLesson?: () => void;
  onPrevLesson?: () => void;
  hasPrevLesson?: boolean;
  hasNextLesson?: boolean;
  lessonIndex?: number;
  totalLessons?: number;
  onOpenLessonsDrawer?: () => void;
  ref?: React.Ref<LessonViewerHandle>;
}

// Icon helper
function getTabIcon(iconName: string, className = "w-4 h-4") {
  switch (iconName) {
    case "FileText":
      return <FileText className={className} />;
    case "ListChecks":
      return <ListChecks className={className} />;
    case "Network":
      return <Network className={className} />;
    case "ClipboardList":
      return <ClipboardList className={className} />;
    case "HelpCircle":
      return <HelpCircle className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "Lightbulb":
      return <Lightbulb className={className} />;
    case "Smile":
      return <Smile className={className} />;
    case "GraduationCap":
      return <GraduationCap className={className} />;
    case "Compass":
      return <Compass className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export const LessonViewer: React.FC<Props> = ({
  lesson,
  book,
  onSaveTabContent,
  onUpdateLessonContent,
  activeTabId: externalActiveTabId,
  onSelectTabId,
  onOpenToolsSheet,
  onNextLesson,
  onPrevLesson,
  hasPrevLesson = false,
  hasNextLesson = false,
  lessonIndex,
  totalLessons,
  onOpenLessonsDrawer,
  ref,
}) => {
  const [internalActiveTabId, setInternalActiveTabId] = useState<TabId>("summary");
  const activeTabId = externalActiveTabId || internalActiveTabId;

  const setActiveTabId = (tabId: TabId) => {
    if (onSelectTabId) {
      onSelectTabId(tabId);
    } else {
      setInternalActiveTabId(tabId);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [customTeacherPrompt, setCustomTeacherPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);

  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const streamThrottleRef = useRef(false);
  const streamBufferRef = useRef<string | null>(null);
  const streamIgnoredRef = useRef(false);

  // Lesson raw text toggle drawer
  const [showRawContent, setShowRawContent] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editableContent, setEditableContent] = useState(lesson.content || "");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState("");
  const [isPresenting, setIsPresenting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSpeakCurrentTab = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    let text = streamingContent || "";
    if (!text && currentTabRecord) {
      if (currentTabRecord.format === "json") {
        text = jsonTabToSpeech(currentTabRecord.data);
      } else {
        text = typeof currentTabRecord.content === "string" ? currentTabRecord.content : "";
      }
    }
    if (!text.trim()) {
      text = [lesson.title, lesson.summary, lesson.content].filter(Boolean).join(". ");
    }
    speak(text, () => setIsSpeaking(false));
    setIsSpeaking(true);
  };

  const handleLessonPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 70 * 1024 * 1024) {
      setPdfExtractError("حجم الملف يتجاوز 70 ميجابايت.");
      return;
    }

    setIsExtractingPdf(true);
    setPdfExtractError("");

    try {
      const optimized = await optimizeFileForUpload(file);
      const res = await extractLessonFromPdf({
        pdfBase64: optimized.dataUrl,
        fileBase64: optimized.dataUrl,
        fileMimeType: optimized.mimeType || "application/pdf",
        lessonTitle: lesson.title,
        bookTitle: book.title,
      });

      if (res.content) {
        setEditableContent(res.content);
        await onUpdateLessonContent(res.content);
        setIsEditingContent(false);
      }
    } catch (err: any) {
      setPdfExtractError(err?.message || "فشل استخراج محتوى الدرس من الملف.");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const activeTabConfig =
    TABS_CONFIG.find((t) => t.id === activeTabId) || TABS_CONFIG[0];
  const currentTabRecord = lesson.generatedTabs?.[activeTabId];

  const jsonTabIds: TabId[] = ["mindMap", "quiz", "glossary", "flashcards"];

  const generateTabInternal = async (
    tabId: TabId,
    prompt?: string,
    stream: boolean = true
  ) => {
    const streamingEnabled = !jsonTabIds.includes(tabId);
    const res = await generateTabWithAI({
      tabType: tabId,
      lessonTitle: lesson.title,
      unitTitle: lesson.unitTitle,
      bookTitle: book.title,
      lessonContent: lesson.content,
      customPrompt: prompt,
      onProgress: stream ? (msg) => setGenerationMessage(msg) : undefined,
      onDelta: stream && streamingEnabled
        ? (text) => {
            if (streamIgnoredRef.current) return;
            streamBufferRef.current = text;
            if (!streamThrottleRef.current) {
              streamThrottleRef.current = true;
              setTimeout(() => {
                streamThrottleRef.current = false;
                if (streamBufferRef.current != null) {
                  setStreamingContent(streamBufferRef.current);
                }
              }, 220);
            }
          }
        : undefined,
    });

    if (!res.success) {
      throw new Error(res.error || "فشل توليد المحتوى");
    }

    const newRecord: TabContentRecord = {
      format: res.format,
      data: res.data,
      content: res.content,
      generatedAt: new Date().toISOString(),
      customPrompt: prompt,
    };

    await onSaveTabContent(tabId, newRecord);
  };

  const handleGenerateTab = async (overridePrompt?: string) => {
    setIsGenerating(true);
    setGenerationMessage("");
    setGenerationError("");
    setStreamingContent(null);
    streamBufferRef.current = null;
    streamIgnoredRef.current = false;
    streamThrottleRef.current = false;

    try {
      const promptToUse =
        overridePrompt !== undefined ? overridePrompt : customTeacherPrompt;

      await generateTabInternal(activeTabId, promptToUse);
      setShowPromptInput(false);
      setCustomTeacherPrompt("");
      // Fire-and-forget: an interstitial may appear right after a successful generate.
      maybeShowInterstitial();
    } catch (err: any) {
      if (!streamIgnoredRef.current) {
        setGenerationError(
          err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي."
        );
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent(null);
      streamBufferRef.current = null;
    }
  };

  const generateAllMissing = async () => {
    const missing = TABS_CONFIG.filter((t) => !lesson.generatedTabs?.[t.id]);
    let generated = 0;
    let failed = 0;
    for (const tab of missing) {
      setActiveTabId(tab.id);
      setGenerationError("");
      setIsGenerating(true);
      setGenerationMessage(
        `جارٍ توليد «${tab.shortTitle}» (${missing.indexOf(tab) + 1}/${missing.length})...`
      );
      setStreamingContent(null);
      streamBufferRef.current = null;
      streamIgnoredRef.current = false;
      streamThrottleRef.current = false;
      try {
        await generateTabInternal(tab.id, "", false);
        generated++;
      } catch (err: any) {
        console.warn("Batch generate failed for", tab.id, err);
        failed++;
      }
    }
    setIsGenerating(false);
    setStreamingContent(null);
    streamBufferRef.current = null;
    return { generated, failed, total: missing.length };
  };

  useImperativeHandle(
    ref,
    () => ({
      generateAllMissing,
    }),
    // Re-expose the imperative handle whenever the lesson changes so
    // generateAllMissing reflects the latest available tabs.
    [lesson, activeTabId]
  );

  const stopStreamingPreview = () => {
    streamIgnoredRef.current = true;
    setStreamingContent(null);
    streamBufferRef.current = null;
  };

  const handleSaveLessonContent = async () => {
    await onUpdateLessonContent(editableContent);
    setIsEditingContent(false);
  };

  const [latestExplanationId, setLatestExplanationId] = useState<string | null>(null);

  // Add explanation generated from highlighted text snippet to the bottom of the content
  const handleAddExplanation = async ({
    selectedText,
    explanation,
  }: {
    selectedText: string;
    explanation: string;
  }) => {
    if (!currentTabRecord) return;

    const newExplId = "expl-" + Date.now();
    const newExplItem = {
      id: newExplId,
      selectedText,
      explanation,
      timestamp: new Date().toISOString(),
    };

    const existingExplanations = currentTabRecord.explanations || [];
    const updatedExplanations = [...existingExplanations, newExplItem];

    // For markdown tabs, we also append it cleanly to the markdown content string so it exports and prints seamlessly:
    let updatedContent = currentTabRecord.content;
    if (currentTabRecord.format === "markdown" && updatedContent) {
      const explanationMarkdown = `\n\n---\n\n### 💡 إيضاح وتفسير الجزء المحدد:\n> **النص المظلل:** «${selectedText}»\n\n${explanation}`;
      updatedContent = updatedContent + explanationMarkdown;
    }

    const updatedRecord: TabContentRecord = {
      ...currentTabRecord,
      content: updatedContent,
      explanations: updatedExplanations,
    };

    await onSaveTabContent(activeTabId, updatedRecord);
    setLatestExplanationId(newExplId);
    setTimeout(() => setLatestExplanationId(null), 3000);
  };

  const handleDeleteExplanation = async (id: string) => {
    if (!currentTabRecord || !currentTabRecord.explanations) return;
    const updatedExplanations = currentTabRecord.explanations.filter(
      (e) => e.id !== id
    );

    const updatedRecord: TabContentRecord = {
      ...currentTabRecord,
      explanations: updatedExplanations,
    };

    await onSaveTabContent(activeTabId, updatedRecord);
  };

  const handleAddQuestion = async (q: QuizQuestion) => {
    const quizRecord = lesson.generatedTabs?.quiz;
    const existing: QuizQuestion[] = quizRecord?.data?.questions || [];
    const newQuestion: QuizQuestion = {
      ...q,
      id: "q-" + Date.now(),
    };
    const updatedRecord: TabContentRecord = {
      format: "json",
      data: { questions: [...existing, newQuestion] },
      generatedAt: quizRecord?.generatedAt || new Date().toISOString(),
    };
    await onSaveTabContent("quiz", updatedRecord);

    try {
      const { saveBankItem } = await import("../services/teacherData");
      await saveBankItem({
        id: "bank-" + Date.now(),
        lessonTitle: lesson.title,
        type: (q.type as any) === "true_false" ? "true_false" : q.type === "essay" ? "essay" : "mcq",
        question: q.question,
        options: (q as any).options,
        correctIndex: (q as any).correctIndex,
        correctBoolean: (q as any).correctBoolean,
        modelAnswer: (q as any).modelAnswer,
        explanation: (q as any).explanation,
        addedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("ستُحفظ في تبويب الاختبار محلياً فقط:", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50">
      {/* Lesson Header */}
      <div className="bg-white border-b border-slate-200 p-4 sm:p-6 shadow-2xs">
        {/* Mobile Quick Lesson Navigator Ribbon */}
        {totalLessons && totalLessons > 1 && (
          <div className="mb-3 flex items-center justify-between gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={onPrevLesson}
              disabled={!hasPrevLesson}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                hasPrevLesson
                  ? "bg-white text-slate-800 shadow-xs active:scale-95 hover:bg-slate-50"
                  : "text-slate-300 cursor-not-allowed"
              }`}
            >
              <span>‹ السابق</span>
            </button>

            <button
              type="button"
              onClick={onOpenLessonsDrawer}
              className="px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 rounded-lg hover:bg-emerald-200 transition-colors"
              title="عرض قائمة كل الدروس"
            >
              الدرس {lessonIndex !== undefined ? lessonIndex + 1 : 1} من {totalLessons}
            </button>

            <button
              type="button"
              onClick={onNextLesson}
              disabled={!hasNextLesson}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
                hasNextLesson
                  ? "bg-white text-slate-800 shadow-xs active:scale-95 hover:bg-slate-50"
                  : "text-slate-300 cursor-not-allowed"
              }`}
            >
              <span>التالي ›</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {lesson.unitTitle}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{lesson.estimatedDuration || "45 دقيقة"}</span>
            </span>
          </div>

          <button
            onClick={() => setShowRawContent(!showRawContent)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span>
              {showRawContent ? "إخفاء نص الدرس الأصلي" : "عرض نص ومحتوى الدرس الأصلي"}
            </span>
            {showRawContent ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
          {lesson.title}
        </h1>

        {lesson.summary && (
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
            {lesson.summary}
          </p>
        )}

        {/* Keywords */}
        {lesson.keyKeywords && lesson.keyKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Tag className="w-3 h-3 text-slate-400" />
            {lesson.keyKeywords.map((kw, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Collapsible Raw Lesson Content Drawer */}
        {showRawContent && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-bold text-slate-700">
                المحتوى الأصلي للدرس المستخرج من الكتاب:
              </span>
              <div className="flex items-center gap-2">
                <label className="text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors text-[11px]">
                  {isExtractingPdf ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                      <span>جارٍ قراءة PDF الدرس...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3 h-3" />
                      <span>تحديث من ملف PDF للدرس</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleLessonPdfUpload}
                    disabled={isExtractingPdf}
                    className="hidden"
                  />
                </label>

                {!isEditingContent ? (
                  <button
                    onClick={() => {
                      setEditableContent(lesson.content || "");
                      setIsEditingContent(true);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل يدوي</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveLessonContent}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700"
                    >
                      حفظ التعديلات
                    </button>
                    <button
                      onClick={() => setIsEditingContent(false)}
                      className="text-slate-500 hover:text-slate-700 font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>

            {pdfExtractError && (
              <div className="mb-2 p-2 bg-rose-100/70 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{pdfExtractError}</span>
              </div>
            )}

            {isEditingContent ? (
              <textarea
                rows={6}
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 text-xs leading-relaxed"
              />
            ) : lesson.content && containsLaTeXMath(lesson.content) ? (
              <div className="text-slate-700 leading-relaxed">
                <MathMarkdown>{lesson.content}</MathMarkdown>
              </div>
            ) : (
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {lesson.content || "لا يوجد نص أصلي محدد لهذا الدرس."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 10 TABS Navigation Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 shadow-2xs no-print">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {/* Quick All-Tools Sheet Button */}
          {onOpenToolsSheet && (
            <button
              type="button"
              onClick={onOpenToolsSheet}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-all shrink-0 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>الأدوات ({TABS_CONFIG.length})</span>
            </button>
          )}

          {/* Read Aloud (TTS) */}
          {speechSupported() && (
            <button
              type="button"
              onClick={handleSpeakCurrentTab}
              title="قراءة الفقرة النشطة صوتياً"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all shrink-0 active:scale-95 ${
                isSpeaking
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-violet-50 text-violet-900 border-violet-200 hover:bg-violet-100"
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isSpeaking ? "إيقاف القراءة" : "قراءة صوتية"}</span>
              {isSpeaking && (
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-3 rounded-full bg-white/70 animate-pulse" />
                  <span className="w-1 h-3 rounded-full bg-white/70 animate-pulse [animation-delay:150ms]" />
                  <span className="w-1 h-3 rounded-full bg-white/70 animate-pulse [animation-delay:300ms]" />
                </span>
              )}
            </button>
          )}

          {TABS_CONFIG.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isGenerated = !!lesson.generatedTabs?.[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setGenerationError("");
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {getTabIcon(tab.icon, "w-4 h-4")}
                <span>{tab.shortTitle}</span>

                {isGenerated ? (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-emerald-300" : "bg-emerald-500"
                    }`}
                    title="تم التوليد"
                  />
                ) : (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-sm ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    جديد
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Workspace Content */}
      <div className="p-3.5 sm:p-6 flex-1 max-w-6xl w-full mx-auto space-y-5 pb-36">
        {/* Error Notification */}
        {generationError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">حدث خطأ:</span>
              <span>{generationError}</span>
            </div>
          </div>
        )}

        {/* Generation Loading State */}
        {isGenerating && streamingContent && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-l from-emerald-50 to-sky-50">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ كتابة المحتوى مباشرة...</span>
              </div>
              <button
                onClick={stopStreamingPreview}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                إيقاف المعاينة المؤقتة
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto streaming-preview">
              <MathMarkdown>{streamingContent}</MathMarkdown>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>اكتملت {streamingContent.length} حرفاً حتى الآن...</span>
              </div>
            </div>
          </div>
        )}

        {/* Generation Loading State */}
        {isGenerating && !streamingContent && (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 relative">
              <Loader2 className="w-8 h-8 animate-spin" />
              <Sparkles className="w-4 h-4 absolute top-2 right-2 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {generationMessage ||
                  `جارٍ إعداد ${activeTabConfig.title} بالذكاء الاصطناعي...`}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                يقوم نموذج Gemini بتحليل محتوى الدرس واستخلاص أدق التفاصيل وتنسيقها
                وفق أحدث المعايير التعليمية.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content NOT Generated Yet */}
        {!isGenerating && !currentTabRecord && (
          <div className="p-10 bg-white rounded-2xl border border-slate-200 shadow-xs text-center flex flex-col items-center justify-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {getTabIcon(activeTabConfig.icon, "w-7 h-7")}
            </div>

            <div className="max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activeTabConfig.badge}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg">
                {activeTabConfig.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {activeTabConfig.description}
              </p>
            </div>

            {/* Optional Teacher Prompt Box */}
            <div className="w-full max-w-lg text-right">
              {!showPromptInput ? (
                <button
                  onClick={() => setShowPromptInput(true)}
                  className="text-xs text-slate-500 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 mb-2"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>إضافة توجيه أو تركيز خاص للذكاء الاصطناعي (اختياري)</span>
                </button>
              ) : (
                <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                    <span>ملاحظاتك للذكاء الاصطناعي:</span>
                    <button
                      onClick={() => setShowPromptInput(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px]"
                    >
                      إلغاء
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="مثال: ركز على الجانب التطبيقي، بسط المصطلحات للطلاب الصغار..."
                    value={customTeacherPrompt}
                    onChange={(e) => setCustomTeacherPrompt(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:border-emerald-500 bg-white"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => handleGenerateTab()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد {activeTabConfig.shortTitle} بالذكاء الاصطناعي</span>
            </button>
          </div>
        )}

        {/* Tab Content IS Generated */}
        {!isGenerating && currentTabRecord && (
          <div className="space-y-6 animate-in fade-in">
            {/* Tab Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs no-print">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800">
                  {activeTabConfig.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  تم التوليد:{" "}
                  {new Date(currentTabRecord.generatedAt).toLocaleDateString(
                    "ar-EG",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ExportTabMenu
                  tabId={activeTabId}
                  record={currentTabRecord}
                  lesson={lesson}
                  book={book}
                />

                {currentTabRecord.format === "markdown" &&
                  currentTabRecord.content &&
                  currentTabRecord.content.trim().length > 0 && (
                    <button
                      onClick={() => setIsPresenting(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
                      title="اعرض المحتوى على الشاشة داخل الحصة"
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      <span>عرض على الشاشة</span>
                    </button>
                  )}

                <button
                  onClick={() => handleGenerateTab()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة التوليد</span>
                </button>
              </div>
            </div>

            {/* Specialized Renderer Dispatch with Double-Click Text Explanation Capability */}
            <TabSelectionExplainer
              lessonTitle={lesson.title}
              unitTitle={lesson.unitTitle}
              bookTitle={book.title}
              tabType={activeTabId}
              tabTitle={activeTabConfig.title}
              lessonContent={lesson.content}
              onAddExplanation={handleAddExplanation}
              onAddQuestion={handleAddQuestion}
            >
              <div className="space-y-6">
                {activeTabId === "summary" && (
                  <TabRendererSummary
                    content={currentTabRecord.content || ""}
                    lessonTitle={lesson.title}
                  />
                )}

                {activeTabId === "bulletPoints" && (
                  <TabRendererBulletPoints
                    content={currentTabRecord.content || ""}
                  />
                )}

                {activeTabId === "mindMap" && (
                  <TabRendererMindMap data={currentTabRecord.data} />
                )}

                {activeTabId === "lessonPlan" && (
                  <TabRendererLessonPlan
                    content={currentTabRecord.content || ""}
                    lessonTitle={lesson.title}
                    unitTitle={lesson.unitTitle}
                    bookTitle={book.title}
                  />
                )}

                {activeTabId === "quiz" && (
                  <TabRendererQuiz data={currentTabRecord.data} />
                )}

                {activeTabId === "glossary" && (
                  <TabRendererGlossary data={currentTabRecord.data} />
                )}

                {activeTabId === "activities" && (
                  <TabRendererActivities
                    content={currentTabRecord.content || ""}
                  />
                )}

                {activeTabId === "flashcards" && (
                  <TabRendererFlashcards data={currentTabRecord.data} />
                )}

                {activeTabId === "criticalThinking" && (
                  <TabRendererCriticalThinking
                    content={currentTabRecord.content || ""}
                  />
                )}

                {activeTabId === "simplifiedExplanation" && (
                  <TabRendererSimplified
                    content={currentTabRecord.content || ""}
                  />
                )}

                {activeTabId === "deepDive" && (
                  <TabRendererDeepDive
                    content={currentTabRecord.content || ""}
                  />
                )}

                {activeTabId === "teacherBriefing" && (
                  <TabRendererTeacherBriefing
                    content={currentTabRecord.content || ""}
                  />
                )}

                {/* Additional Highlighted Text Explanations Section at the Bottom */}
                {currentTabRecord.explanations && currentTabRecord.explanations.length > 0 && (
                  <TabExplanationsList
                    explanations={currentTabRecord.explanations}
                    onDeleteExplanation={handleDeleteExplanation}
                    latestAddedId={latestExplanationId}
                  />
                )}
              </div>
            </TabSelectionExplainer>
          </div>
        )}
      </div>

      {/* Present Mode Overlay */}
      {isPresenting && currentTabRecord && (
        <PresentMode
          content={currentTabRecord.content || currentTabRecord.data?.centerTopic || ""}
          title={activeTabConfig.title}
          onClose={() => setIsPresenting(false)}
        />
      )}
    </div>
  );
};
