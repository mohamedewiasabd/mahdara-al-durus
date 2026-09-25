import React, { useState } from "react";
import { Book, Lesson } from "../types";
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Layers,
} from "lucide-react";

interface Props {
  book: Book;
  lessons: Lesson[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onAddLesson: (unitTitle: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onDeleteBook?: (book: Book) => void;
  isMobileView?: boolean;
  onCloseMobile?: () => void;
}

export const LessonSidebar: React.FC<Props> = ({
  book,
  lessons,
  selectedLessonId,
  onSelectLesson,
  onAddLesson,
  onDeleteLesson,
  onDeleteBook,
  isMobileView,
  onCloseMobile,
}) => {
  const [search, setSearch] = useState("");
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  const toggleUnit = (unitTitle: string) => {
    setCollapsedUnits((prev) => ({ ...prev, [unitTitle]: !prev[unitTitle] }));
  };

  // Filter lessons by search query
  const filteredLessons = lessons.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.summary.toLowerCase().includes(q) ||
      l.unitTitle.toLowerCase().includes(q) ||
      l.keyKeywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Group lessons by unitTitle
  const unitGroups: { unitTitle: string; lessons: Lesson[] }[] = [];
  const unitTitleSet = new Set<string>();

  // Ensure original book units order is preserved
  if (book.units && book.units.length > 0) {
    book.units.forEach((u) => {
      unitTitleSet.add(u.unitTitle);
      const unitLessons = filteredLessons.filter((l) => l.unitTitle === u.unitTitle);
      unitGroups.push({ unitTitle: u.unitTitle, lessons: unitLessons });
    });
  }

  // Any remaining lessons with different unitTitle
  filteredLessons.forEach((l) => {
    if (!unitTitleSet.has(l.unitTitle)) {
      unitTitleSet.add(l.unitTitle);
      const existing = unitGroups.find((g) => g.unitTitle === l.unitTitle);
      if (existing) existing.lessons.push(l);
      else unitGroups.push({ unitTitle: l.unitTitle, lessons: [l] });
    }
  });

  return (
    <aside className="w-full lg:w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden no-print">
      {/* Mobile Pull Handle & Close if mobile view */}
      {isMobileView && (
        <div className="pt-3 pb-1 flex flex-col items-center border-b border-slate-100 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-2" />
          {onCloseMobile && (
            <div className="w-full px-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                فهرس الدروس والمقرر
              </span>
              <button
                onClick={onCloseMobile}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      )}

      {/* Book Metadata Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>{book.subject || "المقرر الدراسي"}</span>
            {book.grade && <span className="text-slate-400">• {book.grade}</span>}
          </div>

          {onDeleteBook && (
            <button
              onClick={() => onDeleteBook(book)}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
              title="حذف هذا المنهج بالكامل"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف المنهج</span>
            </button>
          )}
        </div>
        <h2 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
          {book.title}
        </h2>
        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
          <span>{lessons.length} درساً مقسماً</span>
          <span className="text-emerald-700 font-semibold">محفوظة محلياً ✓</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في الدروس والوحدات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/60"
          />
        </div>
      </div>

      {/* Units & Lessons List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
        {unitGroups.map((group, gIdx) => {
          const isCollapsed = collapsedUnits[group.unitTitle];

          return (
            <div
              key={gIdx}
              className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
            >
              {/* Unit Header */}
              <div
                onClick={() => toggleUnit(group.unitTitle)}
                className="w-full p-2.5 bg-slate-50/90 hover:bg-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {group.unitTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-200/70">
                    {group.lessons.length}
                  </span>
                  {isCollapsed ? (
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Lessons under unit */}
              {!isCollapsed && (
                <div className="p-1.5 space-y-1">
                  {group.lessons.map((lesson) => {
                    const isSelected = selectedLessonId === lesson.id;
                    const generatedCount = Object.keys(
                      lesson.generatedTabs || {}
                    ).length;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson.id)}
                        className={`group relative p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? "bg-emerald-600 text-white font-bold shadow-xs"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs leading-snug line-clamp-2">
                            {lesson.title}
                          </div>

                          <div
                            className={`flex items-center gap-2 mt-1.5 text-[10px] ${
                              isSelected ? "text-emerald-100" : "text-slate-400"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{lesson.estimatedDuration || "45 دقيقة"}</span>
                            </span>

                            <span
                              className={`px-1.5 py-0.5 rounded-md font-semibold ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : generatedCount > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {generatedCount}/10 تبويب
                            </span>
                          </div>
                        </div>

                        {/* Delete Lesson Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`هل تريد حذف درس "${lesson.title}"؟`)) {
                              onDeleteLesson(lesson.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ${
                            isSelected
                              ? "text-white/80 hover:bg-white/20"
                              : "text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          }`}
                          title="حذف الدرس"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => onAddLesson(group.unitTitle)}
                    className="w-full py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة درس في هذه الوحدة</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredLessons.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            لا توجد دروس مطابقة لبحثك.
          </div>
        )}
      </div>
    </aside>
  );
};
