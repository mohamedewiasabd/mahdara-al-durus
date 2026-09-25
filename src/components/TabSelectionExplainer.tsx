import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  X,
  Send,
  HelpCircle,
  CheckCircle2,
  Highlighter,
  ChevronDown,
  ChevronUp,
  PenLine,
  ClipboardCheck,
} from "lucide-react";
import { explainSelectionWithAI, generateQuestionWithAI } from "../services/ai";
import { QuizQuestion } from "../types";

interface Props {
  lessonTitle: string;
  unitTitle?: string;
  bookTitle?: string;
  tabType: string;
  tabTitle: string;
  lessonContent?: string;
  onAddExplanation: (data: { selectedText: string; explanation: string }) => Promise<void>;
  onAddQuestion?: (q: QuizQuestion) => Promise<void>;
  children: React.ReactNode;
}

export const TabSelectionExplainer: React.FC<Props> = ({
  lessonTitle,
  unitTitle,
  bookTitle,
  tabType,
  tabTitle,
  lessonContent,
  onAddExplanation,
  onAddQuestion,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedText, setSelectedText] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [floatingCoords, setFloatingCoords] = useState<{ x: number; y: number } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState(false);
  const [showTipBanner, setShowTipBanner] = useState(true);

  // Instant question state
  const [qPanelOpen, setQPanelOpen] = useState(false);
  const [qType, setQType] = useState<"mcq" | "true_false" | "essay">("mcq");
  const [qLoading, setQLoading] = useState(false);
  const [qResult, setQResult] = useState<QuizQuestion | null>(null);
  const [qError, setQError] = useState("");
  const [qAdded, setQAdded] = useState(false);

  // Check current window selection
  const handleSelection = (e?: React.MouseEvent | React.TouchEvent) => {
    // Avoid resetting if we're clicking inside our floating toolbar / panel
    const target = e?.target as HTMLElement;
    if (target && target.closest(".explainer-interactive-surface")) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (!isPanelOpen) {
        setFloatingCoords(null);
        setSelectedText("");
      }
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 2) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };

        // Position slightly above or below the selection
        const x = Math.max(10, Math.min(window.innerWidth - 220, rect.left + rect.width / 2 - 100));
        const y = rect.top - 48 > 60 ? rect.top - 48 : rect.bottom + 8;

        setSelectedText(text);
        setFloatingCoords({ x, y });
      } catch (err) {
        // Range error fallback
        setSelectedText(text);
      }
    }
  };

  // Double click handler: specifically handles double clicking on any part of the page/text
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Wait a millisecond for the browser's native double-click selection to resolve
    setTimeout(() => {
      const selection = window.getSelection();
      let text = selection ? selection.toString().trim() : "";

      if (!text) {
        // If double click was on an element, try grabbing its immediate text snippet
        const target = e.target as HTMLElement;
        if (target && target.innerText) {
          const words = target.innerText.trim().split(/\s+/);
          text = words.slice(0, 10).join(" ");
        }
      }

      if (text) {
        setSelectedText(text);
        // Calculate coords relative to viewport
        const x = Math.max(10, Math.min(window.innerWidth - 240, e.clientX - 100));
        const y = Math.max(70, e.clientY - 55);
        setFloatingCoords({ x, y });
        setIsPanelOpen(true);
      } else {
        // Open manual selection panel
        setIsPanelOpen(true);
      }
    }, 50);
  };

  const handleRequestExplanation = async () => {
    if (!selectedText.trim()) {
      setError("يرجى تظليل أو كتابة جزء من النص أولاً.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await explainSelectionWithAI({
        selectedText: selectedText.trim(),
        lessonTitle,
        unitTitle,
        bookTitle,
        tabType,
        tabTitle,
        lessonContent,
        customInstruction: customInstruction.trim() || undefined,
      });

      if (!res.success || !res.explanation) {
        throw new Error(res.error || "فشل شرح الجزء المحدد.");
      }

      await onAddExplanation({
        selectedText: selectedText.trim(),
        explanation: res.explanation,
      });

      // Clear state & close
      setIsPanelOpen(false);
      setFloatingCoords(null);
      setSelectedText("");
      setCustomInstruction("");
      window.getSelection()?.removeAllRanges();

      // Show success toast
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);

      // Smooth scroll to the explanations list at the bottom
      setTimeout(() => {
        const bottomElem = document.getElementById("tab-explanations-bottom");
        if (bottomElem) {
          bottomElem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 250);
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء طلب الشرح من الذكاء الاصطناعي.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestion = async () => {
    if (!selectedText.trim() || qLoading) return;
    setQLoading(true);
    setQError("");
    setQResult(null);
    setQAdded(false);
    try {
      const res = await generateQuestionWithAI({
        selectedText: selectedText.trim(),
        lessonTitle,
        questionType: qType,
      });
      if (!res.success || !res.question) {
        throw new Error(res.error || "فشل توليد السؤال من النص المحدد.");
      }
      const q: QuizQuestion = {
        id: "preview-" + Date.now(),
        type: res.question?.type || "mcq",
        question: res.question?.question || "",
        options: res.question?.options || [],
        correctIndex: res.question?.correctIndex,
        correctBoolean: res.question?.correctBoolean,
        explanation: res.question?.explanation,
        modelAnswer: res.question?.modelAnswer,
      };
      setQResult(q);
    } catch (err: any) {
      setQError(err?.message || "حدث خطأ أثناء توليد السؤال.");
    } finally {
      setQLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!qResult || !onAddQuestion) return;
    try {
      await onAddQuestion(qResult);
      setQAdded(true);
      setTimeout(() => setQAdded(false), 2600);
    } catch (err: any) {
      setQError(err?.message || "تعذر حفظ السؤال في بنك الأسئلة.");
    }
  };

  const handleCloseQPanel = () => {
    setQPanelOpen(false);
    setQResult(null);
    setQError("");
    setQAdded(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setFloatingCoords(null);
    setSelectedText("");
    setError("");
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleSelection}
      onTouchEnd={handleSelection}
      onDoubleClick={handleDoubleClick}
      className="relative selection:bg-emerald-200 selection:text-emerald-950"
    >
      {/* Interactive Helper Banner */}
      {showTipBanner && (
        <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs no-print">
          <div className="flex items-center gap-2.5 text-emerald-950 flex-1 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Highlighter className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate sm:whitespace-normal">
                اضغط مرتين على أي كلمة أو ظلل أي جزء من النص لطلب شرحه بالذكاء الاصطناعي
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5 hidden sm:block">
                سيقوم الذكاء الاصطناعي بتبسيط وتوضيح هذا الجزء وإضافته تلقائياً في أسفل هذا التبويب.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>طلب شرح جزء</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTipBanner(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
              title="إخفاء التلميح"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button near selection */}
      {floatingCoords && !isPanelOpen && selectedText && (
        <div
          style={{
            position: "fixed",
            top: `${floatingCoords.y}px`,
            left: `${floatingCoords.x}px`,
            zIndex: 9999,
          }}
          className="explainer-interactive-surface animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xl shadow-emerald-950/20 border border-emerald-500 transition-all active:scale-95 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>شرح هذا الجزء بالذكاء الاصطناعي</span>
            </button>
            <button
              type="button"
              onClick={() => setQPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-violet-700 hover:bg-violet-800 text-white font-black text-xs shadow-xl shadow-violet-950/20 border border-violet-500 transition-all active:scale-95 whitespace-nowrap"
            >
              <PenLine className="w-3.5 h-3.5 text-amber-300" />
              <span>حوّل هذا الجزء إلى سؤال فوري</span>
            </button>
          </div>
        </div>
      )}

      {/* Explanation Request Modal / Popover */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="explainer-interactive-surface bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-lg overflow-hidden text-right animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-amber-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    طلب شرح وتوضيح الجزء المظلل
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    سيُضاف الشرح الناتج تلقائياً في أسفل محتوى التبويب الحالي
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePanel}
                disabled={isLoading}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Selected Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>الجزء المظلل من الصفحة:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (يمكنك تعديل النص أو استكماله)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  placeholder="ظلل نصاً من الصفحة أو اكتب/الصق هنا الجزء المراد شرحه..."
                  disabled={isLoading}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all text-slate-800 font-medium leading-relaxed"
                />
              </div>

              {/* Optional Custom Teacher Instruction */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>توجيه إضافي للشرح (اختياري):</span>
                </label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="مثال: بسط المفهوم للأطفال، اضرب مثالاً تطبيقياً، اربطه بالحياة اليومية..."
                  disabled={isLoading}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Info Note */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">أين ستظهر النتيجة؟</span> سيتم صياغة شرح تربوي دقيق لهذا الجزء وإلحاقه مباشرةً في أسفل الصفحة ضمن محتويات هذا الدرس، مع حفظه تلقائياً في قاعدة البيانات.
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClosePanel}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200/70 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleRequestExplanation}
                disabled={isLoading || !selectedText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ إعداد الشرح بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>توليد الشرح وإضافته بالأسفل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>تمت إضافة شرح الجزء المحدد بنجاح في أسفل الصفحة! ✨</span>
        </div>
      )}

      {/* Instant Question Modal */}
      {qPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="explainer-interactive-surface bg-white rounded-3xl shadow-2xl border border-violet-100 w-full max-w-lg overflow-hidden text-right animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-amber-300 shrink-0">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    تحويل الجزء المحدد إلى سؤال فوري
                  </h3>
                  <p className="text-[11px] text-violet-100 font-medium">
                    سؤال امتحاني جاهز من معن الفقرة أثناء الشرح — أضِفه مباشرة لبنك الأسئلة (تبويب الاختبار)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseQPanel}
                disabled={qLoading}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الجزء المحدد:
                </label>
                <textarea
                  rows={3}
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  placeholder="ظلل نصاً أو اكتب هنا الجزء المراد تحويله إلى سؤال..."
                  disabled={qLoading}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-hidden focus:border-violet-500 focus:bg-white transition-all text-slate-800 font-medium leading-relaxed"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  نوع السؤال:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: "mcq", label: "اختيار من متعدد" },
                    { id: "true_false", label: "صح وخطأ" },
                    { id: "essay", label: "مقالي / استنتاجي" },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQType(t.id)}
                      disabled={qLoading}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                        qType === t.id
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result */}
              {qResult && (
                <div className="p-3.5 bg-violet-50/70 border border-violet-200 rounded-2xl space-y-2 text-xs">
                  <p className="font-black text-slate-800 leading-relaxed">
                    {qResult.question}
                  </p>
                  {qResult.type === "mcq" && qResult.options && (
                    <ol className="space-y-1 pr-1">
                      {qResult.options.map((opt, i) => (
                        <li
                          key={i}
                          className={`leading-relaxed ${
                            i === qResult.correctIndex
                              ? "text-emerald-700 font-bold"
                              : "text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                          {i === qResult.correctIndex && " ✓"}
                        </li>
                      ))}
                    </ol>
                  )}
                  {qResult.type === "true_false" && (
                    <p className="font-bold text-slate-700">
                      الإجابة: {qResult.correctBoolean ? "صح ✓" : "خطأ ✗"}
                    </p>
                  )}
                  {qResult.type === "essay" && qResult.modelAnswer && (
                    <p className="text-slate-700">
                      <span className="font-bold">الإجابة النموذجية:</span>{" "}
                      {qResult.modelAnswer}
                    </p>
                  )}
                  {(qResult.explanation || qResult.modelAnswer) && qResult.type !== "essay" && (
                    <p className="text-slate-600 leading-relaxed">
                      <span className="font-bold">التفسير:</span>{" "}
                      {qResult.explanation}
                    </p>
                  )}
                </div>
              )}

              {qError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  {qError}
                </div>
              )}
              {qAdded && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  أُضيف السؤال إلى بنك الأسئلة في تبويب الاختبار بنجاح ✓
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseQPanel}
                disabled={qLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200/70 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>

              {qResult && onAddQuestion && (
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <ClipboardCheck className="w-4 h-4 text-emerald-200" />
                  <span>إضافة إلى بنك الأسئلة</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateQuestion}
                disabled={qLoading || !selectedText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-md shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {qLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ توليد السؤال...</span>
                  </>
                ) : qResult ? (
                  <>
                    <PenLine className="w-4 h-4 text-amber-200" />
                    <span>توليد سؤال آخر</span>
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 text-amber-200" />
                    <span>توليد السؤال فوراً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render the Tab Content */}
      <div className="tab-selection-content-wrapper">
        {children}
      </div>
    </div>
  );
};
