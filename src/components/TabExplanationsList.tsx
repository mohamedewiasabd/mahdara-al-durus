import React, { useState } from "react";
import { MathMarkdown } from "./MathMarkdown";
import { TabExplanationItem } from "../types";
import {
  Sparkles,
  Quote,
  Copy,
  Check,
  Trash2,
  Clock,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

interface Props {
  explanations: TabExplanationItem[];
  onDeleteExplanation?: (id: string) => void;
  latestAddedId?: string | null;
}

export const TabExplanationsList: React.FC<Props> = ({
  explanations,
  onDeleteExplanation,
  latestAddedId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!explanations || explanations.length === 0) {
    return null;
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="tab-explanations-bottom"
      className="mt-8 pt-6 border-t-2 border-dashed border-emerald-200 space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200/90 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>شروحات وتوضيحات إضافية للأجزاء المحددة</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {explanations.length}
              </span>
            </h3>
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
              تم توليدها بالذكاء الاصطناعي بناءً على تظليل النص والضغط المزدوج
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          مضافة في أسفل محتوى التبويب
        </div>
      </div>

      {/* List of Explanations */}
      <div className="space-y-4">
        {explanations.map((item, index) => {
          const isLatest = latestAddedId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
                isLatest
                  ? "bg-amber-50/80 border-amber-300 shadow-md ring-2 ring-amber-400/40 animate-pulse"
                  : "bg-white border-slate-200 shadow-xs hover:border-emerald-200"
              }`}
            >
              {/* Highlighted Quote Header */}
              <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Quote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      الجزء المحدد (#{index + 1}):
                    </span>
                    <blockquote className="text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 leading-relaxed break-words">
                      «{item.selectedText}»
                    </blockquote>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.explanation)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-xs flex items-center gap-1"
                    title="نسخ الشرح"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-600">تم</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold hidden sm:inline">نسخ</span>
                      </>
                    )}
                  </button>

                  {onDeleteExplanation && (
                    <button
                      type="button"
                      onClick={() => onDeleteExplanation(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف هذا الشرح"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Explanation Content */}
              <div className="text-right space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الشرح والتوضيح التربوي:</span>
                </div>

                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-strong:text-emerald-900 prose-ul:my-1 text-slate-700 font-normal">
                  <MathMarkdown>{item.explanation}</MathMarkdown>
                </div>
              </div>

              {/* Footer Timestamp */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    أضيف بتاريخ:{" "}
                    {new Date(item.timestamp).toLocaleDateString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="text-emerald-700 font-semibold">
                  مدمج في محتوى الدرس
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
