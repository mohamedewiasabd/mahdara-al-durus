import React, { useState } from "react";
import { CheckSquare, Square, Copy, Check, Sparkles, Filter } from "lucide-react";
import { MathMarkdown } from "../MathMarkdown";

interface Props {
  content: string;
  onRegenerate?: () => void;
}

export const TabRendererBulletPoints: React.FC<Props> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<Record<number, boolean>>({});

  // Parse lines to create an interactive checklist if lines start with -, *, or numbers
  const lines = content.split("\n");
  const bulletLines = lines
    .map((line, idx) => ({ text: line.trim(), originalIdx: idx }))
    .filter((l) => l.text.startsWith("-") || l.text.startsWith("*") || /^\d+[\.\)]/.test(l.text));

  const isChecklistUsable = bulletLines.length >= 3;

  const toggleCheck = (idx: number) => {
    setCheckedPoints((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkedCount = Object.values(checkedPoints).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
            تفريغ نقاط الدرس
          </span>
          {isChecklistUsable && (
            <span className="text-xs text-slate-500 font-medium">
              تم إنجاز: <strong className="text-blue-600">{checkedCount}</strong> من{" "}
              {bulletLines.length} بند
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "تم النسخ" : "نسخ النقاط"}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {isChecklistUsable ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="text-xs font-bold text-slate-400 mb-2">
            قائمة المراجعة التفاعلية (انقر على البند لتعليمه كـ "تمت مراجعته"):
          </div>

          <div className="space-y-2.5">
            {bulletLines.map((item, idx) => {
              const isChecked = checkedPoints[idx];
              // Clean bullet markers
              const cleanText = item.text.replace(/^[-*•]\s*/, "").replace(/^\d+[\.\)]\s*/, "");

              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-3 select-none ${
                    isChecked
                      ? "bg-slate-50 border-slate-200 text-slate-400"
                      : "bg-white border-slate-200/90 hover:border-blue-300 text-slate-800 shadow-2xs"
                  }`}
                >
                  <button className="mt-0.5 text-blue-600 hover:text-blue-800 transition-colors shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <div className={`text-xs leading-relaxed font-medium ${isChecked ? "line-through opacity-75" : ""}`}>
                    {cleanText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Raw Markdown Render for full context and headers */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs prose prose-slate max-w-none text-xs leading-relaxed">
        <MathMarkdown>{content}</MathMarkdown>
      </div>
    </div>
  );
};
