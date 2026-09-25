import React from "react";
import { BookOpen, Sparkles, Plus, Database, Layers, CalendarCheck } from "lucide-react";
import { TABS_CONFIG } from "../../data/tabs";

export type MobileNavTab = "lessons" | "prepare" | "tools" | "database" | "tracking";

interface Props {
  activeNav: MobileNavTab;
  onSelectNav: (tab: MobileNavTab) => void;
  onOpenUploadModal: () => void;
  lessonsCount: number;
  currentLessonTitle?: string;
  hasGeneratedTabsCount?: number;
}

export const MobileTabBar: React.FC<Props> = ({
  activeNav,
  onSelectNav,
  onOpenUploadModal,
  lessonsCount,
  currentLessonTitle,
  hasGeneratedTabsCount = 0,
}) => {
  return (
    <nav
      id="mobile-bottom-tab-bar"
      aria-label="شريط التنقل السفلي"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print"
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around relative">
        {/* 1. Lessons Drawer / List */}
        <button
          type="button"
          id="tab-btn-lessons"
          onClick={() => onSelectNav("lessons")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
            activeNav === "lessons"
              ? "text-emerald-700 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="relative">
            <BookOpen className={`w-5 h-5 ${activeNav === "lessons" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {lessonsCount > 0 && (
              <span className="absolute -top-1.5 -left-2 bg-emerald-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {lessonsCount > 99 ? "99+" : lessonsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">الدروس</span>
        </button>

        {/* 2. Active Preparation View */}
        <button
          type="button"
          id="tab-btn-prepare"
          onClick={() => onSelectNav("prepare")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
            activeNav === "prepare"
              ? "text-emerald-700 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="relative">
            <Layers className={`w-5 h-5 ${activeNav === "prepare" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {hasGeneratedTabsCount > 0 && (
              <span className="absolute -top-1.5 -left-2 bg-teal-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {hasGeneratedTabsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">التحضير</span>
        </button>

        {/* 3. CENTER ACTION BUTTON: Add / Upload Book (PDF / Text) */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-5">
          <button
            type="button"
            id="tab-btn-add-book"
            onClick={onOpenUploadModal}
            className="w-12 h-12 rounded-full bg-linear-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/35 border-3 border-white active:scale-90 transition-transform"
            title="رفع كتاب بصيغة PDF أو نص لتقسيمه"
          >
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </button>
          <span className="text-[10px] font-extrabold text-emerald-800 mt-1">
            رفع كتاب
          </span>
        </div>

        {/* 4. 10 AI Tools Sheet Picker */}
        <button
          type="button"
          id="tab-btn-tools"
          onClick={() => onSelectNav("tools")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
            activeNav === "tools"
              ? "text-emerald-700 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 ${activeNav === "tools" ? "stroke-[2.5] text-amber-500" : "stroke-[1.8]"}`} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">الأدوات ({TABS_CONFIG.length})</span>
        </button>

        {/* 5. Database & Settings */}
        <button
          type="button"
          id="tab-btn-database"
          onClick={() => onSelectNav("database")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
            activeNav === "database"
              ? "text-emerald-700 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="relative">
            <Database className={`w-5 h-5 ${activeNav === "database" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">قاعدتي</span>
        </button>

        {/* 6. Tracking, Plans & Question Bank */}
        <button
          type="button"
          id="tab-btn-tracking"
          onClick={() => onSelectNav("tracking")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-95 ${
            activeNav === "tracking"
              ? "text-emerald-700 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div className="relative">
            <CalendarCheck className={`w-5 h-5 ${activeNav === "tracking" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">المتابعة</span>
        </button>
      </div>
    </nav>
  );
};
