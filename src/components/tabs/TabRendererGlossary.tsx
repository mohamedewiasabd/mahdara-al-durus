import React, { useState } from "react";
import { GlossaryData, GlossaryTerm } from "../../types";
import { Search, BookOpen, AlertTriangle, Lightbulb, Copy, Check } from "lucide-react";

interface Props {
  data: GlossaryData;
  onRegenerate?: () => void;
}

export const TabRendererGlossary: React.FC<Props> = ({ data }) => {
  const terms: GlossaryTerm[] = data?.terms || [];
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  if (!terms || terms.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        لم يتم العثور على مصطلحات في المعجم. يمكنك استخراجها بالذكاء الاصطناعي.
      </div>
    );
  }

  // Extract categories
  const categories = Array.from(
    new Set(terms.map((t) => t.category).filter(Boolean))
  ) as string[];

  const filtered = terms.filter((t) => {
    const matchesSearch =
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase()) ||
      (t.example && t.example.toLowerCase().includes(search.toLowerCase()));

    const matchesCat =
      selectedCategory === "all" || t.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const handleCopy = (term: GlossaryTerm) => {
    const text = `📌 ${term.term}\nالتعريف: ${term.definition}${
      term.example ? `\nمثال: ${term.example}` : ""
    }`;
    navigator.clipboard.writeText(text);
    setCopiedTerm(term.term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search and Category Filter */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث في المفاهيم والمصطلحات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selectedCategory === "all"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({terms.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedCategory === cat
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t, idx) => (
          <div
            key={idx}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{t.term}</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  {t.category && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {t.category}
                    </span>
                  )}
                  <button
                    onClick={() => handleCopy(t)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                    title="نسخ المصطلح"
                  >
                    {copiedTerm === t.term ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Definition */}
              <p className="text-xs text-slate-700 leading-relaxed mb-3">
                {t.definition}
              </p>

              {/* Example */}
              {t.example && (
                <div className="mb-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 ml-1">مثال تطبيقي:</strong>
                    {t.example}
                  </div>
                </div>
              )}

              {/* Common Mistake */}
              {t.commonMistake && (
                <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-900 ml-1">خطأ شائع وتصحيحه:</strong>
                    {t.commonMistake}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          لم يتم العثور على مصطلحات مطابقة لبحثك.
        </div>
      )}
    </div>
  );
};
