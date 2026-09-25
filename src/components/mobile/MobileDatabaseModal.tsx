import React, { useState } from "react";
import {
  X,
  Database,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Smartphone,
  BookOpen,
  Info,
  Trash2,
  KeyRound,
  Zap,
  Save,
} from "lucide-react";
import { Book, Lesson } from "../../types";
import { getGeminiKeyState, setRuntimeGeminiKey } from "../../services/geminiDirect";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  lessons: Lesson[];
  onExportDB: () => void;
  onImportDB: (file: File) => void;
  onResetToSeed?: () => void;
  onDeleteBookRequest?: (book: Book) => void;
}

export const MobileDatabaseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  books,
  lessons,
  onExportDB,
  onImportDB,
  onResetToSeed,
  onDeleteBookRequest,
}) => {
  const [keyDraft, setKeyDraft] = useState(() => getGeminiKeyState().runtime);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportDB(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200/80 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                قاعدة البيانات المحلية وإعدادات التطبيق
              </h3>
              <p className="text-[11px] text-slate-500">
                حفظ آمن ومحلي 100% على جهازك بدون الحاجة للاتصال
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 pb-safe text-xs">
          {/* Status Card */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>حالة التخزين المحلي (IndexedDB)</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>متصل ونشط</span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/90 leading-relaxed">
              جميع الكتب المقسمة، ومحتوى الدروس، وتبويبات الذكاء الاصطناعي المولدة محفوظة على ذاكرة جهازك المحلية وتعمل دون أي فقدان عند إغلاق التطبيق.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-emerald-200/60">
              <div className="p-2 bg-white/80 rounded-xl text-center">
                <span className="block text-[10px] text-slate-500">الكتب المحفوظة</span>
                <span className="text-sm font-extrabold text-slate-900">{books.length}</span>
              </div>
              <div className="p-2 bg-white/80 rounded-xl text-center">
                <span className="block text-[10px] text-slate-500">إجمالي الدروس</span>
                <span className="text-sm font-extrabold text-slate-900">{lessons.length}</span>
              </div>
            </div>
          </div>

          {/* Gemini API Key — runtime activation (as on Flatpak/Snap builds) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                مفتاح الذكاء الاصطناعي (Gemini)
              </span>
              {getGeminiKeyState().builtin ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  المفتاح مضمَّن بالنسخة
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                  مطلوب إدخاله
                </span>
              )}
            </h4>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                في النسخ غير المضمَّنة (مثل Flathub أو النسخ المبنية دون مفتاح) أدخل مفتاح
                Gemini هنا لتفعيل أدوات الذكاء الاصطناعي — يُحفظ محلياً على جهازك فقط ولا يُرفع.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  dir="ltr"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="AIza…"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRuntimeGeminiKey(keyDraft);
                    setSavedFlash(keyDraft.trim() ? "تم حفظ المفتاح محلياً" : "تمت إزالة المفتاح");
                    setTimeout(() => setSavedFlash(null), 3000);
                  }}
                  className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  حفظ
                </button>
              </div>
              {savedFlash && (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  {savedFlash}
                </p>
              )}
            </div>
          </div>

          {/* Manage Stored Curricula */}
          {books.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>المناهج والكتب المحفوظة ({books.length}):</span>
                <span className="text-[10px] text-slate-400 font-normal">يمكنك حذف أي منهج بالكامل</span>
              </h4>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {books.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="truncate flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {b.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {b.subject || "مقرر دراسي"} {b.grade ? `• ${b.grade}` : ""}
                      </div>
                    </div>

                    {onDeleteBookRequest && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onDeleteBookRequest(b);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                        title="حذف هذا المنهج بالكامل"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف المنهج</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export / Import Actions */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs">
              النسخ الاحتياطي والمزامنة:
            </h4>

            <button
              onClick={() => {
                onExportDB();
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">تصدير نسخة احتياطية كاملة</div>
                  <div className="text-[11px] text-slate-500">حفظ عبر Google Drive أو على الجهاز — يشمل كل الكتب والدروس والتحضيرات</div>
                </div>
              </div>
            </button>

            <label className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors active:scale-[0.98] cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">استيراد نسخة احتياطية</div>
                  <div className="text-[11px] text-slate-500">استرجاع بيانات الدروس من ملف JSON سابق</div>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {onResetToSeed && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("هل تريد إعادة ضبط قاعدة البيانات إلى النموذج الافتراضي التجريبي؟")) {
                    onResetToSeed();
                    onClose();
                  }
                }}
                className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-colors text-center"
              >
                إعادة تعيين البيانات إلى النموذج التجريبي الافتراضي
              </button>
            )}
          </div>

          {/* Mobile App Information */}
          <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/70 flex items-center gap-2.5 text-[11px] text-slate-600">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              محضر الدروس مصمم في الأساس كتطبيق موبايل تفاعلي وسريع لتحضير وتجهيز الحصص الدراسية.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
