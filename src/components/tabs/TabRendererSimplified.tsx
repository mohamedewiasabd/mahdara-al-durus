import React, { useState } from "react";
import { MathMarkdown } from "../MathMarkdown";
import { Smile, Copy, Check, Printer, HeartHandshake } from "lucide-react";

interface Props {
  content: string;
}

export const TabRendererSimplified: React.FC<Props> = ({ content }) => {
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
          <div className="p-2 bg-fuchsia-50 text-fuchsia-700 rounded-lg">
            <Smile className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">تبسيط الشرح وتشبيهات واقعية</h4>
            <span className="text-xs text-slate-500">
              أسلوب ممتع، تشبيهات من الحياة اليومية، وحكايات تقرب الفكرة
            </span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "تم النسخ" : "نسخ الشرح"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="prose prose-fuchsia max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4">
          <MathMarkdown>{content}</MathMarkdown>
        </div>
      </div>
    </div>
  );
};
