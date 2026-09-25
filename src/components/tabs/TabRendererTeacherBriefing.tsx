import React, { useState } from "react";
import { MathMarkdown } from "../MathMarkdown";
import {
  Compass,
  Copy,
  Check,
  Printer,
  Zap,
  KeyRound,
  AlertTriangle,
  ListOrdered,
  Link2,
  HelpCircle,
  MessagesSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Props {
  content: string;
}

interface BriefingSection {
  heading: string;
  body: string;
}

function splitSections(content: string): BriefingSection[] {
  const sections: BriefingSection[] = [];
  const lines = content.split("\n");
  let currentHeading = "";
  let body: string[] = [];
  const push = () => {
    if (currentHeading) {
      sections.push({ heading: currentHeading.trim(), body: body.join("\n").trim() });
    }
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      push();
      currentHeading = line.replace(/^##\s+/, "").replace(/#+$/, "").trim();
      body = [];
    } else if (/^#\s+/.test(line) && !currentHeading) {
      currentHeading = "";
      body = [];
    } else {
      body.push(line);
    }
  }
  push();
  return sections;
}

const SECTION_META: { keys: string[]; icon: React.ReactNode; color: string }[] = [
  {
    keys: ["الزبدة"],
    icon: <Zap className="w-4 h-4" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    keys: ["المفاهيم الحرجة", "المفاتيح"],
    icon: <KeyRound className="w-4 h-4" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    keys: ["المفاهيم الخاطئة"],
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    keys: ["تسلسل الشرح"],
    icon: <ListOrdered className="w-4 h-4" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    keys: ["روابط الدرس"],
    icon: <Link2 className="w-4 h-4" />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    keys: ["أسئلة الامتحان"],
    icon: <HelpCircle className="w-4 h-4" />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    keys: ["حوار صفّي", "سقراطية"],
    icon: <MessagesSquare className="w-4 h-4" />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
];

function metaFor(heading: string) {
  return (
    SECTION_META.find((m) => m.keys.some((k) => heading.includes(k))) || {
      keys: [],
      icon: <Compass className="w-4 h-4" />,
      color: "bg-slate-50 text-slate-700 border-slate-200",
    }
  );
}

export const TabRendererTeacherBriefing: React.FC<Props> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const sections = splitSections(content);
  const meaningful = sections.filter((s) => s.body || s.heading);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOpen = (heading: string) =>
    meaningful.length <= 3 ? true : openSections.has(heading) || openSections.size === 0;

  const toggle = (heading: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-gradient-to-l from-emerald-700 to-teal-800 text-white rounded-2xl border border-emerald-400/30 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base">
              بطاقة إحاطة المعلم قبل الحصة
            </h4>
            <p className="text-[11px] text-emerald-100 font-medium">
              اقرأها في 5 دقائق وستكون ملمّاً بكل تفصيلة وجاهزاً للشرح بثقة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "تم النسخ" : "نسخ البطاقة"}</span>
          </button>
        </div>
      </div>

      {meaningful.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <MathMarkdown>{content}</MathMarkdown>
        </div>
      ) : (
        <div className="space-y-4">
          {meaningful.map((section, idx) => {
            const meta = metaFor(section.heading);
            const open = isOpen(section.heading);
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => toggle(section.heading)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-right ${meta.color}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shadow-xs shrink-0">
                      {meta.icon}
                    </span>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">
                        {section.heading || `القسم ${idx + 1}`}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        القسم {idx + 1} من {meaningful.length}
                      </span>
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {open && (
                  <div className="p-5">
                    <div className="prose prose-emerald max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed">
                      <MathMarkdown>{section.body}</MathMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};