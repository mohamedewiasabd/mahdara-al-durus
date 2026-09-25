import React, { useState } from "react";
import { FlashcardsData, FlashcardItem } from "../../types";
import { ChevronRight, ChevronLeft, Shuffle, RotateCcw, Check, Sparkles, HelpCircle, Layers, Grid, Play } from "lucide-react";

interface Props {
  data: FlashcardsData;
  onRegenerate?: () => void;
}

export const TabRendererFlashcards: React.FC<Props> = ({ data }) => {
  const initialCards = data?.cards || [];
  const [cards, setCards] = useState<FlashcardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"card" | "grid">("card");

  if (!initialCards || initialCards.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        لم يتم العثور على بطاقات استذكار. يمكنك إعادة التوليد بالذكاء الاصطناعي.
      </div>
    );
  }

  const currentCard = cards[currentIndex] || cards[0];
  const isMastered = masteredIds[currentCard?.id];

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setShowHint(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const toggleMastery = (id: string) => {
    setMasteredIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const masteredCount = Object.values(masteredIds).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Flashcards Top Controls */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              بطاقات الاستذكار السريع (Flashcards)
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>إجمالي البطاقات: {cards.length}</span>
              <span className="text-indigo-600 font-semibold">
                تم إتقان: {masteredCount} من {cards.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "card" ? "grid" : "card")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            {viewMode === "card" ? (
              <>
                <Grid className="w-3.5 h-3.5" />
                <span>عرض كشبكة</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>وضع الاستذكار الفردي</span>
              </>
            )}
          </button>

          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="خلط عشوائي"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>خلط</span>
          </button>
        </div>
      </div>

      {viewMode === "card" ? (
        <div className="flex flex-col items-center max-w-xl mx-auto">
          {/* Progress Bar */}
          <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
            <span>
              البطاقة <strong className="text-slate-800">{currentIndex + 1}</strong> من{" "}
              {cards.length}
            </span>
            <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / cards.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Interactive 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 cursor-pointer perspective-1000 select-none group"
          >
            <div
              className={`relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d shadow-md hover:shadow-xl border-2 ${
                isFlipped
                  ? "rotate-y-180 border-indigo-400 bg-linear-to-br from-indigo-900 to-slate-900 text-white"
                  : "border-slate-200 bg-linear-to-br from-white via-indigo-50/20 to-slate-50 text-slate-800"
              }`}
            >
              {/* FRONT OF CARD */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden ${
                  isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                    {currentCard?.category || "مفهوم / سؤال"}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span>انقر لقلب البطاقة</span>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  </span>
                </div>

                <div className="text-center my-auto">
                  <p className="text-xl font-bold leading-relaxed text-slate-900">
                    {currentCard?.front}
                  </p>
                  {showHint && currentCard?.hint && (
                    <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 inline-block">
                      💡 تلميح: {currentCard.hint}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  {currentCard?.hint ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showHint ? "إخفاء التلميح" : "عرض تلميح"}</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  <span>الوجه الأمامي</span>
                </div>
              </div>

              {/* BACK OF CARD */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden transform-rotate-y-180 ${
                  !isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-indigo-200">
                    الإجابة والشرح
                  </span>
                  <span className="text-xs text-slate-300">الوجه الخلفي</span>
                </div>

                <div className="text-center my-auto">
                  <p className="text-lg font-medium leading-relaxed text-white whitespace-pre-line">
                    {currentCard?.back}
                  </p>
                </div>

                <div className="text-center text-xs text-indigo-200 pt-2 border-t border-white/10">
                  انقر للعودة للسؤال
                </div>
              </div>
            </div>
          </div>

          {/* Card Action Buttons */}
          <div className="w-full flex items-center justify-between mt-6 gap-3">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابقة</span>
            </button>

            <button
              onClick={() => toggleMastery(currentCard.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isMastered
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isMastered ? "تم الإتقان والحفظ ✓" : "تحديد كمتقنة"}</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
            >
              <span>التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Grid Overview Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <div
              key={c.id || i}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    بطاقة #{i + 1}
                  </span>
                  <button
                    onClick={() => toggleMastery(c.id)}
                    className={`text-xs px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      masteredIds[c.id]
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {masteredIds[c.id] ? "متقنة ✓" : "غير متقنة"}
                  </button>
                </div>

                <div className="font-bold text-slate-900 text-sm mb-2">
                  {c.front}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {c.back}
                </div>
              </div>

              {c.hint && (
                <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-md">
                  💡 تلميح: {c.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
