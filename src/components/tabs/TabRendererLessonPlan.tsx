import React, { useState } from "react";
import { MathMarkdown } from "../MathMarkdown";
import { ClipboardList, Printer, Copy, Check, Award, Clock, Users } from "lucide-react";

interface Props {
  content: string;
  lessonTitle: string;
  unitTitle: string;
  bookTitle: string;
}

export const TabRendererLessonPlan: React.FC<Props> = ({
  content,
  lessonTitle,
  unitTitle,
  bookTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">دفتر تحضير الدرس النموذجي</h4>
              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-semibold">
                معايير تربوية حديثة
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              خطة تعليمية متكاملة لمديري المدارس والمشرفين التربويين والمعلمين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة خطة الدرس</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "تم النسخ" : "نسخ الخطة"}</span>
          </button>
        </div>
      </div>

      {/* Official Plan Header Table */}
      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block">المقرر / الكتاب:</span>
          <strong className="text-slate-800 text-sm">{bookTitle}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">الوحدة الدراسية:</span>
          <strong className="text-slate-800 text-sm">{unitTitle}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">موضوع الدرس:</span>
          <strong className="text-amber-900 text-sm">{lessonTitle}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">زمن الحصة المقترح:</span>
          <strong className="text-slate-800 text-sm">45 دقيقة</strong>
        </div>
      </div>

      {/* Lesson Plan Markdown Content */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs print:border-none print:shadow-none">
        <div className="prose prose-amber max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4">
          <MathMarkdown>{content}</MathMarkdown>
        </div>
      </div>
    </div>
  );
};
