import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  Store,
  RefreshCw,
  Loader2,
  WifiOff,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  OurApp,
  loadAppsWithBackgroundRefresh,
  loadApps,
  getAppsCacheAgeDays,
  openAppLink,
} from "../../services/ourApps";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const APP_AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-indigo-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-blue-600",
  "bg-violet-600",
  "bg-cyan-600",
];

const CACHE_TRUST_MAX_DAYS = 10;

export const MobileOurAppsSheet: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apps, setApps] = useState<OurApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("");

  const applyResult = useCallback(
    (appsList: OurApp[], fromCache: boolean, updated: boolean) => {
      setApps(appsList);
      setStatus(
        fromCache
          ? updated
            ? "تم تحديث القائمة من الإنترنت"
            : appsList.length > 0
            ? "قائمة محفوظة محلياً (متاحة بدون إنترنت)"
            : "جارٍ تحميل قائمة التطبيقات..."
          : "تم جلب القائمة من الإنترنت"
      );
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    loadAppsWithBackgroundRefresh((res) => {
      applyResult(res.apps, res.fromCache, res.updated);
      const days = getAppsCacheAgeDays();
      setLastUpdatedText(
        days === null
          ? "غير محدّثة بعد"
          : `آخر تحديث منذ ${days} يوم`
      );
      setLoading(false);
    });
  }, [isOpen, applyResult]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await loadApps({ force: true });
      applyResult(res.apps, res.fromCache, res.updated);
      setLastUpdatedText("تم التحديث الآن");
    } catch (err) {
      setStatus("تعذر الاتصال بالإنترنت — يتم عرض القائمة المحفوظة.");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen) return null;

  const cacheDays = getAppsCacheAgeDays();
  const cacheExpired =
    cacheDays !== null && cacheDays > CACHE_TRUST_MAX_DAYS;

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
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">تطبيقاتنا</h3>
              <p className="text-[11px] text-slate-500">
                تطبيقات أندرويد من فريق محضر الدروس
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
              title="تحديث القائمة الآن"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4 pb-safe text-xs">
          {/* Status Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
              cacheExpired
                ? "bg-amber-50 border-amber-200/80 text-amber-800"
                : "bg-emerald-50/80 border-emerald-200/80 text-emerald-900"
            }`}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
            ) : cacheExpired ? (
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-1.5">
                {cacheExpired ? "قائمة مؤقتة — تتجاوز 10 أيام" : status}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {lastUpdatedText}
                  {cacheDays !== null
                    ? ` • تتحدث تلقائياً كل ${CACHE_TRUST_MAX_DAYS} أيام عند توفر الإنترنت`
                    : " • ستتحدث تلقائياً عند توفر الإنترنت"}
                </span>
              </div>
            </div>
          </div>

          {/* Apps list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-[11px] font-bold">
                جارٍ تحميل قائمة التطبيقات...
              </span>
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Smartphone className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">
                لا توجد تطبيقات متاحة حالياً
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                سوف تظهر هنا تطبيقاتنا الجديدة عند نشرها.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {apps.map((app, i) => (
                <div
                  key={app.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl ${
                      APP_AVATAR_COLORS[i % APP_AVATAR_COLORS.length]
                    } text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <span className="font-extrabold text-lg">
                      {(app.name || "ت").trim().charAt(0)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs truncate">
                      {app.name || "تطبيق"}
                    </div>
                    {app.details && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {app.details}
                      </p>
                    )}
                    {app.packageName && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono truncate" dir="ltr">
                        {app.packageName}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openAppLink(app)}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200/70 flex items-center gap-2.5 text-[11px] text-slate-600">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              تُحفظ القائمة على جهازك وتعمل دون إنترنت، ويتم تحديثها تلقائياً كل
              10 أيام عند توفر الشبكة.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};