import React, { useState, useRef, useEffect } from "react";
import { TabId, TabContentRecord, Lesson, Book } from "../types";
import { TABS_CONFIG } from "../data/tabs";
import {
  exportTabContent,
  ExportFormat,
  ExportMetadata,
} from "../utils/exportUtils";
import {
  Download,
  Printer,
  FileText,
  FileCode,
  Globe,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { ExportTabModal } from "./ExportTabModal";

interface Props {
  tabId: TabId;
  record: TabContentRecord;
  lesson: Lesson;
  book: Book;
  buttonClassName?: string;
}

export const ExportTabMenu: React.FC<Props> = ({
  tabId,
  record,
  lesson,
  book,
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
  const meta: ExportMetadata = {
    lessonTitle: lesson.title,
    unitTitle: lesson.unitTitle,
    bookTitle: book.title,
    tabTitle: tabConfig?.title || "المحتوى",
    tabId,
    subject: book.subject,
    grade: book.grade,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setExportingFormat(format);
    try {
      const result = await exportTabContent(format, tabId, record, meta);
      if (result && typeof result === "object" && "uri" in result && !result.shared) {
        alert(`تم حفظ الملف في جهازك بنجاح.\nالموقع: ${result.uri}`);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err instanceof Error
          ? `تعذر تصدير الملف: ${err.message}`
          : "تعذر تصدير الملف، يرجى المحاولة مرة أخرى."
      );
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <>
      <div className="relative inline-block text-right" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={exportingFormat !== null}
          className={
            buttonClassName ||
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 rounded-xl transition-all active:scale-95 shadow-2xs"
          }
          title="تصدير هذا التبويب بصيغ PDF, MD, DOCX, HTML"
        >
          {exportingFormat ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Download className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>تصدير التبويب</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-right animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400">
              اختر صيغة التصدير لهذا التبويب:
            </div>

            {/* 1. PDF */}
            <button
              type="button"
              onClick={() => handleQuickExport("pdf")}
              className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-900 font-bold flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-rose-600" />
                <span>مستند PDF (للطباعة)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold">
                .pdf
              </span>
            </button>

            {/* 2. DOCX (Word) */}
            <button
              type="button"
              onClick={() => handleQuickExport("docx")}
              className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 font-bold flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>مستند وورد (Word DOCX)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold">
                .docx
              </span>
            </button>

            {/* 3. Markdown (MD) */}
            <button
              type="button"
              onClick={() => handleQuickExport("md")}
              className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 font-bold flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>ماركداون (Markdown MD)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                .md
              </span>
            </button>

            {/* 4. HTML */}
            <button
              type="button"
              onClick={() => handleQuickExport("html")}
              className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-bold flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <span>صفحة ويب متكاملة (HTML)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold">
                .html
              </span>
            </button>

            {/* Modal opener */}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full px-3 py-1.5 text-[11px] text-slate-500 hover:text-emerald-700 hover:bg-slate-50 font-bold flex items-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>معاينة وجميع خيارات التصدير...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <ExportTabModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tabId={tabId}
        record={record}
        lesson={lesson}
        book={book}
      />
    </>
  );
};
