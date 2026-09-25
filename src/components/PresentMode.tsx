import React, { useEffect, useMemo, useState, useCallback } from "react";
import { MathMarkdown } from "./MathMarkdown";
import { socraticQuestionsWithAI } from "../services/ai";
import {
  X,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sparkles,
  MessageCircleQuestion,
  Loader2,
} from "lucide-react";

const MAX_SLIDE_CHARS = 1500;

function splitToSlides(md: string): string[] {
  const normalized = md.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const parts = normalized.split(/\n(?=#{1,4}\s+)/);
  const slides: string[] = [];
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.length <= MAX_SLIDE_CHARS) {
      slides.push(part);
      continue;
    }
    const m = part.match(/^(#{1,4}\s+[^\n]+)\n+/);
    const head = m ? m[1] : "";
    const body = m ? part.slice(m[0].length) : part;
    const paras = body.split(/\n\s*\n/).filter((p) => p.trim());
    let chunk = "";
    const flush = () => {
      if (chunk.trim()) slides.push((head ? head + "\n\n" : "") + chunk.trim());
      chunk = "";
    };
    for (const p of paras) {
      if ((chunk ? chunk + "\n\n" + p : p).length > MAX_SLIDE_CHARS) flush();
      chunk = chunk ? chunk + "\n\n" + p : p;
    }
    flush();
  }
  return slides.length ? slides : [normalized];
}

export function stripMarkdownForTTS(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>~|\[\]()]/g, " ")
    .replace(/\$\$[\s\S]+?\$\$/g, " المعادلة التالية ")
    .replace(/\$[^$\n]+?\$/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Props {
  content: string;
  title?: string;
  onClose: () => void;
}

export const PresentMode: React.FC<Props> = ({ content, title, onClose }) => {
  const slides = useMemo(() => splitToSlides(content), [content]);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [socraticOpen, setSocraticOpen] = useState(false);
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [socraticQuestions, setSocraticQuestions] = useState<string[]>([]);

  const total = slides.length;

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);
  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goNext();
      else if (e.key === "ArrowRight") goPrev();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(2.2, s + 0.15));
      else if (e.key === "-") setScale((s) => Math.max(0.7, s - 0.15));
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleSocratic = async () => {
    if (socraticLoading) return;
    const slideText = stripMarkdownForTTS(slides[index]);
    setSocraticLoading(true);
    try {
      const res = await socraticQuestionsWithAI({
        slideText: slideText.slice(0, 2500),
        lessonTitle: title,
      });
      if (res && Array.isArray(res.questions)) {
        setSocraticQuestions(res.questions);
      } else {
        setSocraticQuestions([res?.error || "تعذر توليد الأسئلة."]);
      }
      setSocraticOpen(true);
    } catch (err: any) {
      setSocraticQuestions([err?.message || "تعذر الاتصال بالذكاء الاصطناعي."]);
      setSocraticOpen(true);
    } finally {
      setSocraticLoading(false);
    }
  };

  const currentSlide = slides[index] || content;

  return (
    <div className="fixed inset-0 z-[9998] bg-[#0b1220] text-white flex flex-col present-mode">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 no-print">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircleQuestion className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold truncate">
            {title || "وضع العرض"} — شريحة {index + 1} من {total}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="تصغير الخط"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="تكبير الخط"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="ملء الشاشة (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs transition-colors"
          >
            <span className="flex items-center gap-1">
              <X className="w-4 h-4" />
              إغلاق
            </span>
          </button>
        </div>
      </div>

      {/* Slide Body */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center p-6 sm:p-10">
        <div
          className="max-w-5xl w-full transition-all"
          style={{ fontSize: `${scale}rem`, lineHeight: 1.9 }}
        >
          <div className="prose prose-invert max-w-none text-white text-right leading-loose">
            <MathMarkdown>{currentSlide}</MathMarkdown>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/10 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 font-bold text-xs transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
          <div className="text-[11px] text-slate-300 px-2">
            {index + 1} / {total}
          </div>
          <button
            onClick={goNext}
            disabled={index >= total - 1}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 font-bold text-xs transition-colors"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSocratic}
            disabled={socraticLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
          >
            {socraticLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            أسئلة حوار (سقراطية)
          </button>
          <div className="text-[10px] text-slate-400 hidden sm:block">
            الأسهم للتنقل • +/- للتكبير • F ملء الشاشة • Esc خروج
          </div>
        </div>
      </div>

      {/* Socratic Questions Panel */}
      {socraticOpen || socraticQuestions.length > 0 ? (
        <div className="absolute left-4 bottom-20 w-[min(92vw,420px)] bg-[#16213a] border border-violet-400/30 rounded-2xl shadow-2xl p-4 text-right max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-black text-sm text-violet-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              أسئلة حوار للحصة
            </h5>
            <button
              onClick={() => {
                setSocraticOpen(false);
                setSocraticQuestions([]);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {socraticLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              جارٍ توليد أسئلة الحوار...
            </div>
          ) : (
            <ol className="space-y-2.5">
              {socraticQuestions.map((q, i) => (
                <li key={i} className="text-xs leading-relaxed text-slate-200 bg-white/5 rounded-xl p-2.5">
                  {q}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
};