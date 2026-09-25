import React, { useState } from "react";
import { Book } from "../../types";
import {
  BookOpen,
  ChevronDown,
  Layers,
  Sparkles,
  PlusCircle,
  Smartphone,
  Maximize2,
  Minimize2,
  Database,
  Store,
  Trash2,
} from "lucide-react";

interface Props {
  books: Book[];
  currentBook: Book | null;
  onSelectBook: (book: Book) => void;
  onOpenUploadModal: () => void;
  isDesktopFrame: boolean;
  onToggleDesktopFrame: () => void;
  onOpenDatabase: () => void;
  onOpenApps: () => void;
  onDeleteBookRequest?: (book: Book) => void;
}

export const MobileTopBar: React.FC<Props> = ({
  books,
  currentBook,
  onSelectBook,
  onOpenUploadModal,
  isDesktopFrame,
  onToggleDesktopFrame,
  onOpenDatabase,
  onOpenApps,
  onDeleteBookRequest,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs no-print pt-safe">
      {/* Top Mobile Status Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Book Selector */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Logo */}
          <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>

          {/* Book Switcher Button */}
          <div className="relative min-w-0 flex-1">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full text-right flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/70 transition-colors"
            >
              <div className="truncate">
                <span className="block text-[10px] text-slate-400 font-bold leading-tight truncate">
                  محضر الدروس
                </span>
                <span className="block text-xs font-extrabold text-slate-900 truncate">
                  {currentBook ? currentBook.title : "اختر كتاباً..."}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                    الكتب والمناهج المحفوظة ({books.length})
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1 space-y-1">
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
                              <div className="truncate text-slate-900 font-semibold">{b.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {b.subject || "مقرر عام"} {b.grade ? `• ${b.grade}` : ""}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mr-1.5" />
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

                    {books.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        لم تقم برفع أي كتاب حتى الآن
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenUploadModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>رفع كتاب أو PDF جديد</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Our Apps */}
          <button
            onClick={onOpenApps}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="تطبيقاتنا"
          >
            <Store className="w-4 h-4 text-indigo-600" />
          </button>

          {/* DB Indicator */}
          <button
            onClick={onOpenDatabase}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="قاعدة البيانات المحلية"
          >
            <div className="relative">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </div>
          </button>

          {/* Desktop Frame Toggle (hidden on small mobile screens) */}
          <button
            onClick={onToggleDesktopFrame}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
            title={isDesktopFrame ? "تبديل إلى ملء الشاشة" : "تبديل إلى مقاس الهاتف"}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isDesktopFrame ? "شاشة هاتف" : "شاشة واسعة"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
