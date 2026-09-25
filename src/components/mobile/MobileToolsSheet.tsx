import React from "react";
import { TabId, Lesson } from "../../types";
import { TABS_CONFIG } from "../../data/tabs";
import {
  X,
  Sparkles,
  FileText,
  ListChecks,
  Network,
  ClipboardList,
  HelpCircle,
  BookOpen,
  Layers,
  Lightbulb,
  Smile,
  GraduationCap,
  CheckCircle2,
  Loader2,
  Wand2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTabId: TabId;
  onSelectTab: (tabId: TabId) => void;
  currentLesson?: Lesson;
  onGenerateAllMissing?: () => void | Promise<void>;
  generatingAll?: boolean;
}

const ICON_MAP: Record<string, any> = {
  FileText,
  ListChecks,
  Network,
  ClipboardList,
  HelpCircle,
  BookOpen,
  Sparkles,
  Layers,
  Lightbulb,
  Smile,
  GraduationCap,
};

export const MobileToolsSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  activeTabId,
  onSelectTab,
  currentLesson,
  onGenerateAllMissing,
  generatingAll = false,
}) => {
  if (!isOpen) return null;

  const generatedCount = currentLesson
    ? TABS_CONFIG.filter((t) => !!currentLesson.generatedTabs?.[t.id]).length
    : 0;
  const missingCount = TABS_CONFIG.length - generatedCount;
  const showBatchCTA = !!currentLesson && missingCount > 0 && !!onGenerateAllMissing;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop touch to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Container */}
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200/80 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                أدوات الذكاء الاصطناعي ({TABS_CONFIG.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                {currentLesson ? `للدرس: ${currentLesson.title}` : "اختر أداة لتحضير وتجهيز الدرس"}
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

        {/* Tools Grid List */}
        <div className="p-4 overflow-y-auto space-y-2 pb-safe">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TABS_CONFIG.map((tab) => {
              const IconComp = ICON_MAP[tab.icon] || Sparkles;
              const isSelected = activeTabId === tab.id;
              const isGenerated = !!currentLesson?.generatedTabs?.[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl text-right transition-all flex items-start gap-3 border active:scale-[0.98] ${
                    isSelected
                      ? "bg-emerald-50/80 border-emerald-500 shadow-xs"
                      : "bg-slate-50/70 hover:bg-slate-100 border-slate-200/80"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {tab.title}
                      </span>
                      {isGenerated && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>جاهز</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rewarded batch generation CTA */}
          {showBatchCTA && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-l from-amber-50 to-emerald-50 border border-amber-200/70">
              <button
                onClick={onGenerateAllMissing}
                disabled={generatingAll}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-extrabold transition-all active:scale-[0.98] ${
                  generatingAll
                    ? "bg-slate-200 text-slate-500 cursor-wait"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30"
                }`}
              >
                {generatingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>
                  {generatingAll
                    ? "جارٍ توليد الأدوات المتبقية..."
                    : `توليد كل الأدوات المتبقية دفعة واحدة (${missingCount})`}
                </span>
              </button>
              <p className="text-[11px] text-slate-600 mt-1.5 text-center leading-relaxed">
                شاهد إعلانًا قصيرًا واحصل على توليد شامل لكل الأدوات غير المجهزة
                بالذكاء الاصطناعي في هذا الدرس.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
