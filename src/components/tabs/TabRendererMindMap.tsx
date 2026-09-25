import React, { useState } from "react";
import { MindMapData, MindMapBranch } from "../../types";
import { ChevronDown, ChevronRight, Copy, Check, ZoomIn, ZoomOut, RotateCcw, Share2, Sparkles } from "lucide-react";

interface Props {
  data: MindMapData;
  onRegenerate?: () => void;
}

export const TabRendererMindMap: React.FC<Props> = ({ data, onRegenerate }) => {
  const [selectedBranch, setSelectedBranch] = useState<MindMapBranch | null>(
    data?.branches?.[0] || null
  );
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!data || !data.branches || data.branches.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        لم يتم العثور على بيانات للخريطة الذهنية. يمكنك إعادة التوليد.
      </div>
    );
  }

  const toggleCollapse = (id: string) => {
    setCollapsedBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyTextOutline = () => {
    let outline = `🧠 خريطة ذهنية: ${data.centerTopic}\n`;
    if (data.description) outline += `الوصف: ${data.description}\n\n`;

    data.branches.forEach((b, i) => {
      outline += `🔹 ${i + 1}. ${b.title}\n`;
      b.subBranches?.forEach((sb) => {
        outline += `   ▫️ ${sb.title}${sb.details ? `: ${sb.details}` : ""}\n`;
      });
      outline += "\n";
    });

    navigator.clipboard.writeText(outline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const branchColors = [
    { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", badge: "bg-emerald-600", light: "#10b981" },
    { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", badge: "bg-blue-600", light: "#3b82f6" },
    { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800", badge: "bg-purple-600", light: "#8b5cf6" },
    { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", badge: "bg-amber-600", light: "#f59e0b" },
    { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-800", badge: "bg-rose-600", light: "#f43f5e" },
    { bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-800", badge: "bg-cyan-600", light: "#06b6d4" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-md">
            {data.branches.length} فروع رئيسية
          </span>
          <span className="text-xs text-slate-500">
            {data.branches.reduce((acc, b) => acc + (b.subBranches?.length || 0), 0)} فكرة فرعية
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition-colors"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleCopyTextOutline}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "تم النسخ" : "نسخ النص"}</span>
          </button>
        </div>
      </div>

      {/* Visual Mind Map Canvas */}
      <div className="relative overflow-auto p-8 bg-linear-to-br from-slate-50 via-white to-slate-100/70 rounded-2xl border border-slate-200 shadow-inner min-h-[480px]">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top right" }}
          className="transition-transform duration-200 flex flex-col items-center gap-10"
        >
          {/* Central Root Node */}
          <div className="relative z-10 px-8 py-5 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 text-center max-w-md border-2 border-emerald-400/40">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-1.5 text-[11px] font-bold bg-white/20 text-white rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>الموضوع المركزي</span>
            </div>
            <h3 className="text-xl font-bold tracking-wide">{data.centerTopic}</h3>
            {data.description && (
              <p className="mt-1 text-xs text-emerald-100/90 leading-relaxed line-clamp-2">
                {data.description}
              </p>
            )}
          </div>

          {/* Branches Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.branches.map((branch, idx) => {
              const color = branchColors[idx % branchColors.length];
              const isCollapsed = collapsedBranches[branch.id];
              const isSelected = selectedBranch?.id === branch.id;

              return (
                <div
                  key={branch.id || idx}
                  onClick={() => setSelectedBranch(branch)}
                  className={`cursor-pointer transition-all duration-200 rounded-xl border-2 p-5 ${color.bg} ${color.border} ${
                    isSelected ? "ring-2 ring-slate-800 shadow-md scale-[1.02]" : "hover:shadow-sm"
                  }`}
                >
                  {/* Branch Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${color.badge}`}>
                        {idx + 1}
                      </span>
                      <h4 className={`font-bold text-base ${color.text}`}>
                        {branch.title}
                      </h4>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(branch.id);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:bg-white/80 transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronLeftCustom className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Sub-branches */}
                  {!isCollapsed && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-200/60">
                      {branch.subBranches && branch.subBranches.length > 0 ? (
                        branch.subBranches.map((sub, sIdx) => (
                          <div
                            key={sub.id || sIdx}
                            className="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 text-xs shadow-2xs hover:bg-white transition-colors"
                          >
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {sub.title}
                            </div>
                            {sub.details && (
                              <p className="mt-1 text-slate-600 leading-relaxed pr-3 text-[11px]">
                                {sub.details}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">لا توجد تفريعات إضافية</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Branch Detail Card */}
      {selectedBranch && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              تفاصيل المحور: {selectedBranch.title}
            </h5>
            <span className="text-xs text-slate-500">
              {selectedBranch.subBranches?.length || 0} نقاط تفصيلية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {selectedBranch.subBranches?.map((sb, i) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="font-semibold text-xs text-slate-800 block mb-1">
                  {sb.title}
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {sb.details || "تفاصيل المفهوم وتطبيقاته في الدرس."}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function ChevronLeftCustom(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
