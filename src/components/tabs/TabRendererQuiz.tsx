import React, { useState } from "react";
import { QuizData, QuizQuestion } from "../../types";
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Eye, Award, Check, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  data: QuizData;
  onRegenerate?: () => void;
}

export const TabRendererQuiz: React.FC<Props> = ({ data }) => {
  const questions = data?.questions || [];
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | boolean>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [revealedEssay, setRevealedEssay] = useState<Record<string, boolean>>({});

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        لم يتم العثور على أسئلة في بنك الأسئلة. يمكنك إعادة التوليد.
      </div>
    );
  }

  const mcqAndTfQuestions = questions.filter((q) => q.type === "mcq" || q.type === "true_false");
  const essayQuestions = questions.filter((q) => q.type === "essay");

  // Calculate score
  let correctCount = 0;
  let answeredCount = 0;

  mcqAndTfQuestions.forEach((q) => {
    const ans = selectedAnswers[q.id];
    if (ans !== undefined) {
      answeredCount++;
      if (q.type === "mcq" && ans === q.correctIndex) {
        correctCount++;
      } else if (q.type === "true_false" && ans === q.correctBoolean) {
        correctCount++;
      }
    }
  });

  const handleSelectAnswer = (qId: string, answer: number | boolean) => {
    setSelectedAnswers((prev) => {
      const updated = { ...prev, [qId]: answer };
      // Check if finished and high score to fire confetti
      const currentAnswered = Object.keys(updated).length;
      if (currentAnswered === mcqAndTfQuestions.length && mcqAndTfQuestions.length > 0) {
        let currentCorrect = 0;
        mcqAndTfQuestions.forEach((q) => {
          const a = updated[q.id];
          if (q.type === "mcq" && a === q.correctIndex) currentCorrect++;
          if (q.type === "true_false" && a === q.correctBoolean) currentCorrect++;
        });
        const percentage = (currentCorrect / mcqAndTfQuestions.length) * 100;
        if (percentage >= 70) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
      }
      return updated;
    });
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setRevealedExplanations({});
    setShowAllSolutions(false);
    setRevealedEssay({});
  };

  const isCompleted = mcqAndTfQuestions.length > 0 && answeredCount === mcqAndTfQuestions.length;

  return (
    <div className="space-y-6">
      {/* Score and Controls Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">الاختبار التفاعلي للدرس</h4>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                {questions.length} أسئلة
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              الإجابات الصحيحة: <span className="font-bold text-emerald-600">{correctCount}</span> من{" "}
              <span>{mcqAndTfQuestions.length}</span> (تمت الإجابة على {answeredCount})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAllSolutions((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors text-slate-700"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showAllSolutions ? "إخفاء الحلول" : "كشف الإجابات النموذجية"}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة الاختبار</span>
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-4 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base">
                أحسنت! أتممت حل جميع الأسئلة الموضوعية
              </div>
              <div className="text-xs text-emerald-100 mt-0.5">
                النتيجة النهائية: {correctCount} / {mcqAndTfQuestions.length} بنسبة نجاح{" "}
                {Math.round((correctCount / mcqAndTfQuestions.length) * 100)}%
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-lg shadow-xs hover:bg-emerald-50 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isAnswered = selectedAnswers[q.id] !== undefined;
          const selectedVal = selectedAnswers[q.id];
          const isShowSol = showAllSolutions || revealedExplanations[q.id];

          return (
            <div
              key={q.id || idx}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {q.type === "mcq"
                      ? "اختيار من متعدد"
                      : q.type === "true_false"
                      ? "صح أم خطأ"
                      : "سؤال مقالي"}
                  </span>
                </div>

                {q.explanation && (
                  <button
                    onClick={() =>
                      setRevealedExplanations((prev) => ({
                        ...prev,
                        [q.id]: !prev[q.id],
                      }))
                    }
                    className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{isShowSol ? "إخفاء الشرح" : "تفسير الإجابة"}</span>
                  </button>
                )}
              </div>

              {/* Question Text */}
              <h5 className="font-bold text-slate-900 text-sm leading-relaxed mb-4">
                {q.question}
              </h5>

              {/* Options for MCQ */}
              {q.type === "mcq" && q.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedVal === optIdx;
                    const isCorrect = q.correctIndex === optIdx;

                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white";
                    if (isAnswered || isShowSol) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-300";
                      } else {
                        btnStyle = "opacity-60 border-slate-200 text-slate-500 bg-slate-50";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectAnswer(q.id, optIdx)}
                        className={`p-3 text-right text-xs rounded-xl border transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px]">
                            {["أ", "ب", "ج", "د"][optIdx] || optIdx + 1}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {(isAnswered || isShowSol) && (
                          <div>
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : isSelected ? (
                              <XCircle className="w-4 h-4 text-rose-500" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True/False Buttons */}
              {q.type === "true_false" && (
                <div className="flex items-center gap-3">
                  {[
                    { label: "صحيحة (صح)", val: true },
                    { label: "خاطئة (خطأ)", val: false },
                  ].map((btn) => {
                    const isSelected = selectedVal === btn.val;
                    const isCorrect = q.correctBoolean === btn.val;

                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white";
                    if (isAnswered || isShowSol) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-400";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-300";
                      } else {
                        btnStyle = "opacity-60 border-slate-200 text-slate-500 bg-slate-50";
                      }
                    }

                    return (
                      <button
                        key={String(btn.val)}
                        onClick={() => handleSelectAnswer(q.id, btn.val)}
                        className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 ${btnStyle}`}
                      >
                        <span>{btn.label}</span>
                        {(isAnswered || isShowSol) && isCorrect && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Essay Questions Model Answer */}
              {q.type === "essay" && (
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setRevealedEssay((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      {revealedEssay[q.id] || showAllSolutions
                        ? "إخفاء الإجابة النموذجية"
                        : "عرض الإجابة النموذجية ومعايير التصحيح"}
                    </span>
                  </button>

                  {(revealedEssay[q.id] || showAllSolutions) && (
                    <div className="mt-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed">
                      <span className="font-bold block mb-1 text-emerald-900">
                        الإجابة النموذجية المعتمدة:
                      </span>
                      {q.modelAnswer || q.explanation || "راجع مفاهيم الدرس الأساسية."}
                    </div>
                  )}
                </div>
              )}

              {/* Explanation Box */}
              {isShowSol && q.explanation && q.type !== "essay" && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 ml-1">تفسير علمي:</span>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
