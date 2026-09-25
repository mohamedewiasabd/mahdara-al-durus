import React, { useState } from "react";
import { Book } from "../types";
import { TABS_CONFIG } from "../data/tabs";
import {
  BookOpen,
  PlusCircle,
  Database,
  ChevronDown,
  Download,
  Upload,
  Layers,
  Sparkles,
  Check,
  Trash2,
} from "lucide-react";

interface Props {
  books: Book[];
  currentBook: Book | null;
  onSelectBook: (book: Book) => void;
  onOpenUploadModal: () => void;
  onExportDB: () => void;
  onImportDB: (file: File) => void;
  onDeleteBookRequest?: (book: Book) => void;
}

export const Navbar: React.FC<Props> = ({
  books,
  currentBook,
  onSelectBook,
  onOpenUploadModal,
  onExportDB,
  onImportDB,
  onDeleteBookRequest,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDbMenu, setShowDbMenu] = useState(false);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportDB(file);
      setShowDbMenu(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                محضر الدروس
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>الذكاء الاصطناعي</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              تقسيم الكتب وإعداد الدروس مع {TABS_CONFIG.length} أداة ذكية في قاعدة بيانات محلية
            </p>
          </div>
        </div>

        {/* Center: Book Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[220px]">
              {currentBook ? currentBook.title : "اختر كتاباً..."}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  الكتب والمناهج المحفوظة محلياً ({books.length})
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                  {books.map((b) => {
                    const isSelected = currentBook?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`group/book w-full rounded-xl text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBook(b);
                            setDropdownOpen(false);
                          }}
                          className="flex-1 text-right p-2.5 min-w-0 flex items-center justify-between"
                        >
                          <div className="truncate pr-1">
                            <div className="truncate text-slate-900">{b.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {b.subject} {b.grade ? `• ${b.grade}` : ""}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mr-2" />
                          )}
                        </button>

                        {onDeleteBookRequest && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(false);
                              onDeleteBookRequest(b);
                            }}
                            className="p-2 ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                            title="حذف هذا المنهج بالكامل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenUploadModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>رفع أو إضافة كتاب جديد</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Actions: Upload & Database Menu */}
        <div className="flex items-center gap-2">
          {/* Database Pill */}
          <div className="relative">
            <button
              onClick={() => setShowDbMenu(!showDbMenu)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 transition-colors"
              title="قاعدة البيانات المحلية"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>قاعدة محلية</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {showDbMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDbMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>حالة قاعدة البيانات المحلية</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    جميع الكتب والدروس والتبويبات المولدة محفوظة محلياً في متصفحك
                    (IndexedDB) وتعمل بلا انقطاع.
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setShowDbMenu(false);
                        onExportDB();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>تصدير نسخة احتياطية (JSON)</span>
                    </button>

                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer w-full text-right">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>استيراد نسخة احتياطية</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Upload Book Button */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">رفع كتاب أو مقرر</span>
            <span className="sm:hidden">كتاب جديد</span>
          </button>
        </div>
      </div>
    </header>
  );
};
