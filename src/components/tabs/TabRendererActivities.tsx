import React, { useState } from "react";
import { MathMarkdown } from "../MathMarkdown";
import { Sparkles, Copy, Check, Printer, FlaskConical, Target } from "lucide-react";

interface Props {
  content: string;
}

export const TabRendererActivities: React.FC<Props> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-50 text-cyan-700 rounded-lg">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">الأنشطة الصفية والمشاريع التطبيقية</h4>
            <span className="text-xs text-slate-500">تجارب استكشافية وتطبيقات عملية</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "تم النسخ" : "نسخ الأنشطة"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="prose prose-cyan max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4">
          <MathMarkdown>{content}</MathMarkdown>
        </div>
      </div>
    </div>
  );
};
