import React, { useState } from "react";
import { TabId, TabContentRecord, Lesson, Book } from "../types";
import { TABS_CONFIG } from "../data/tabs";
import {
  exportTabContent,
  generateTabMarkdown,
  ExportFormat,
  ExportMetadata,
} from "../utils/exportUtils";
import {
  X,
  Download,
  FileText,
  FileCode,
  Globe,
  Printer,
  Copy,
  Check,
  Sparkles,
  Loader2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tabId: TabId;
  record: TabContentRecord;
  lesson: Lesson;
  book: Book;
}

export const ExportTabModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tabId,
  record,
  lesson,
  book,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"formatted" | "markdown">("formatted");

  if (!isOpen) return null;

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

  const markdownContent = generateTabMarkdown(tabId, record, meta);

  const handleExport = async (format: ExportFormat) => {
    setSavedMessage(null);
    setIsExporting(true);
    try {
      const result = await exportTabContent(format, tabId, record, meta);
      if (result && typeof result === "object" && "uri" in result) {
        setSavedMessage(
          result.shared
            ? `تم حفظ الملف وفتحت نافذة المشاركة.\nالموقع: ${result.uri}`
            : `تم حفظ الملف في جهازك.\nالموقع: ${result.uri}`
        );
      }
      setTimeout(() => setSavedMessage(null), 12000);
    } catch (err) {
      console.error("Export error:", err);
      alert(
        err instanceof Error
          ? `حدث خطأ أثناء التصدير: ${err.message}`
          : "حدث خطأ أثناء التصدير، يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatsList = [
    {
      id: "pdf" as ExportFormat,
      title: "مستند PDF (طباعة وحفظ)",
      badge: "جاهز للطباعة",
      ext: ".pdf",
      icon: Printer,
      color: "bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400",
      activeRing: "ring-rose-500 border-rose-500 bg-rose-50/70",
      description: "مستند رسمي منسق بمعايير الطباعة A4 باللغة العربية، مناسب للطباعة والتوزيع على الطلاب.",
    },
    {
      id: "docx" as ExportFormat,
      title: "مستند وورد (Word DOCX)",
      badge: "قابل للتعديل",
      ext: ".docx",
      icon: FileText,
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400",
      activeRing: "ring-blue-500 border-blue-500 bg-blue-50/70",
      description: "ملف مايكروسوفت وورد أصلي RTL يدعم التعديل الكامل وإعادة التنسيق في Word و Google Docs.",
    },
    {
      id: "md" as ExportFormat,
      title: "ماركداون (Markdown MD)",
      badge: "نص مهيكل",
      ext: ".md",
      icon: FileCode,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400",
      activeRing: "ring-emerald-500 border-emerald-500 bg-emerald-50/70",
      description: "نص منسق بنظام ماركداون القياسي UTF-8 مدعوم في Notion و Obsidian وتطبيقات الملاحظات.",
    },
    {
      id: "html" as ExportFormat,
      title: "صفحة ويب تفاعلية (HTML)",
      badge: "صفحة ويب",
      ext: ".html",
      icon: Globe,
      color: "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400",
      activeRing: "ring-amber-500 border-amber-500 bg-amber-50/70",
      description: "صفحة إنترنت متكاملة الألوان والخطوط تعمل بدون اتصال وتفتح في أي متصفح هاتف أو حاسوب.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  تصدير {tabConfig?.title || "التبويب"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {tabConfig?.badge || "تصدير"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lesson.title} • {lesson.unitTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Format Selection Grid */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2.5">
              اختر صيغة التصدير المطلوبة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {formatsList.map((f) => {
                const isSelected = selectedFormat === f.id;
                const Icon = f.icon;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFormat(f.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? `ring-2 ${f.activeRing} shadow-sm`
                        : `${f.color} hover:shadow-2xs`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="font-black text-xs">{f.title}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                        {f.ext}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-85">
                      {f.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Direct Download Action Callout */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-emerald-900">
              <span className="font-extrabold block">الصيغة المحددة: {formatsList.find((f) => f.id === selectedFormat)?.title}</span>
              <span className="text-[11px] text-emerald-700">اضغط زر التحميل أدناه لتنزيل الملف فوراً على جهازك</span>
            </div>
            <button
              onClick={() => handleExport(selectedFormat)}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all active:scale-95 shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ التصدير...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل بصيغة {formatsList.find((f) => f.id === selectedFormat)?.ext.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>

          {/* Success feedback */}
          {savedMessage && (
            <div className="p-3.5 bg-emerald-600/10 border border-emerald-400 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-1">
              <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap break-all">
                <span className="font-extrabold block mb-1">تم التصدير بنجاح ✓</span>
                {savedMessage}
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>معاينة المحتوى المصدر</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  title="نسخ النص كاملاً للحافظة"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 max-h-56 overflow-y-auto text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed bg-white">
              {markdownContent}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF سريع</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport("docx")}
              disabled={isExporting}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Word سريع</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport("md")}
              disabled={isExporting}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Markdown</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport("html")}
              disabled={isExporting}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
