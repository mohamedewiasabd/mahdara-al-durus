import React, { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowRight, Award, BookOpen, CheckCircle2, Gift, GraduationCap, Lock,
  Play, Sparkles, Star, Trophy, UserRound, Users, X, Zap,
} from "lucide-react";
import { Book, Lesson, StudentProfile, StudentProgress, ProgressSummary } from "../../types";
import { localDb } from "../../services/db";
import {
  BADGES, LearningEventResult, SummaryContext, getActiveProfileId, getProfiles,
  getProgress, loadSummaryContext, markLessonOpen, recordFlashcards,
  recordQuiz, saveProfile, setActiveProfileId, summarize, xpForLevel,
} from "../../services/learning";
import { TabRendererSummary } from "../tabs/TabRendererSummary";
import { TabRendererFlashcards } from "../tabs/TabRendererFlashcards";
import { TabRendererQuiz } from "../tabs/TabRendererQuiz";
import { TabRendererSimplified } from "../tabs/TabRendererSimplified";
import { TabRendererGlossary } from "../tabs/TabRendererGlossary";

type View = "journey" | "lesson" | "badges" | "gifts";
// مفاتيح generatedTabs الفعلية — لا تُغيَّر إذ يُستخدم وجود التبويب لتفعيل الزر.
type LessonTab = "summary" | "flashcards" | "quiz" | "simplifiedExplanation" | "glossary";

const AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐸", "🦄", "🐙", "🐣", "🚀", "🌟", "🎈"];

interface Props {
  onBackToTeacher: () => void;
}

export const StudentApp: React.FC<Props> = ({ onBackToTeacher }) => {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [ctx, setCtx] = useState<SummaryContext | null>(null);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [view, setView] = useState<View>("journey");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonTab, setLessonTab] = useState<LessonTab>("summary");
  const [celebration, setCelebration] = useState<LearningEventResult | null>(null);
  const [showProfiles, setShowProfiles] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState("🦊");
  const [toast, setToast] = useState("");

  const reload = useCallback(async (target?: StudentProfile) => {
    const [allBooks, allLessons, allProfiles] = await Promise.all([
      localDb.getBooks(),
      localDb.getAllLessonsRaw(),
      getProfiles(),
    ]);
    const context = await loadSummaryContext(allBooks, allLessons);
    const storedId = getActiveProfileId();
    const active = target || allProfiles.find((p) => p.id === storedId) || allProfiles[0] || null;
    if (active) setActiveProfileId(active.id);
    const prog = active ? await getProgress(active.id) : null;
    setBooks(allBooks);
    setLessons(allLessons);
    setCtx(context);
    setProfiles(allProfiles);
    setProfile(active);
    setProgress(prog);
    setSummary(active && prog ? summarize(active, prog, context) : null);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refreshProgress = useCallback(async () => {
    if (!profile || !ctx) return;
    const fresh = await getProgress(profile.id);
    setProgress(fresh);
    setSummary(summarize(profile, fresh, ctx));
  }, [profile, ctx]);

  const handleCreateProfile = async () => {
    const name = newName.trim();
    if (!name) { setToast("اكتب اسمك أولًا"); return; }
    const created: StudentProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name, avatar: newAvatar, createdAt: new Date().toISOString(),
    };
    await saveProfile(created);
    setNewName("");
    setShowProfiles(false);
    await reload(created);
    setToast(`أهلًا ${name}! رحلتك بدأت 🌟`);
  };

  const handleOpenLesson = async (lessonId: string, unlocked: boolean) => {
    if (!unlocked) { setToast("أكمل الدرس السابق أولًا لفتح هذا الدرس 🔒"); return; }
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson || !profile || !ctx) return;
    setSelectedLesson(lesson);
    setLessonTab("summary");
    setView("lesson");
    const result = await markLessonOpen(profile, lesson, ctx);
    if (result?.newBadges.length || result?.gift) setCelebration(result);
    await refreshProgress();
  };

  const handleQuizResult = async (percentage: number) => {
    if (!profile || !ctx || !selectedLesson) return;
    const result = await recordQuiz(profile, selectedLesson, percentage, ctx);
    await refreshProgress();
    setCelebration(result);
  };

  const handleCardMastery = async (mastered: number, total: number) => {
    if (!profile || !ctx || !selectedLesson) return;
    const result = await recordFlashcards(profile, selectedLesson, mastered, total, ctx);
    await refreshProgress();
    if (result && (result.xpGained >= 4 || result.newBadges.length || result.gift)) setCelebration(result);
  };

  const lessonContent = useMemo(() => {
    if (!selectedLesson) return null;
    return selectedLesson.generatedTabs || {};
  }, [selectedLesson]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3">تُجهَّز رحلتك…</p>
        </div>
      </div>
    );
  }

  // ملف طالب جديد — يعمل منفردًا تمامًا دون معلم أو حساب
  if (!profile || !summary) {
    return (
      <div className="flex-1 min-h-0 max-h-full overflow-y-auto bg-linear-to-b from-emerald-50 to-slate-50 p-5">
        <div className="max-w-md mx-auto pt-6 space-y-5">
          <button onClick={onBackToTeacher} className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <ArrowRight className="w-4 h-4" /> العودة إلى وضع المعلم
          </button>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 text-4xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              🎒
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-4">أهلًا بك في مسارك!</h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              تدرّج في دروسك حسب مستواك، اجمع النقاط والشارات، وافتح هدايا مفاجئة كلما تقدّمت.
              كل شيء محفوظ على هذا الجهاز ولا تحتاج أي حساب.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700">اختر رمزك</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setNewAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ${
                    newAvatar === a ? "border-emerald-500 bg-emerald-50 scale-110" : "border-slate-200"
                  }`}>{a}</button>
              ))}
            </div>
            <label className="block text-xs font-bold text-slate-700">اسمك</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleCreateProfile(); }}
              placeholder="اكتب اسمك هنا" maxLength={24}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" />
            <button onClick={() => void handleCreateProfile()}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 transition-colors">
              ابدأ رحلتي 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  const level = summary.level;
  const pctInLevel = Math.min(100, Math.round((summary.xpInLevel / Math.max(1, xpForLevel(level + 1) - xpForLevel(level))) * 100));

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50 relative">
      {/* رأس الطالب */}
      <div className="shrink-0 bg-linear-to-br from-emerald-600 to-teal-700 text-white px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProfiles(true)} className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0"
            title="تبديل الملف"><span>{profile.avatar}</span></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-sm truncate">{profile.name}</p>
              <button onClick={onBackToTeacher} className="text-[10px] bg-white/15 hover:bg-white/25 rounded-lg px-2 py-1 font-bold flex items-center gap-1 shrink-0">
                <GraduationCap className="w-3 h-3" /> المعلم
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-amber-400 text-amber-950 font-black rounded-full px-2 py-0.5 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> المستوى {level}
              </span>
              <span className="text-[10px] text-emerald-50 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {summary.totalXp} نقطة
              </span>
              {summary.streak > 0 && <span className="text-[10px] text-emerald-50 flex items-center gap-1">🔥 {summary.streak} أيام</span>}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-amber-300 rounded-full transition-all duration-500" style={{ width: `${pctInLevel}%` }} />
          </div>
          <p className="text-[10px] text-emerald-50 mt-1 text-center">
            {summary.xpInLevel} / {xpForLevel(level + 1) - xpForLevel(level)} نقطة للمستوى التالي
          </p>
        </div>
      </div>

      {/* تبويبات الطالب */}
      <div className="shrink-0 flex bg-white border-b border-slate-200 overflow-x-auto">
        {([
          { id: "journey", label: "مساري", icon: BookOpen },
          { id: "lesson", label: "درسي", icon: Play },
          { id: "badges", label: "شاراتي", icon: Award },
          { id: "gifts", label: "هداياي", icon: Gift },
        ] as { id: View; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors ${
              view === id ? "text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50" : "text-slate-500"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* المحتوى — حاوية تمرير داخلية محصورة تمامًا */}
      <div className="flex-1 min-h-0 max-h-full overflow-y-auto p-4 space-y-4">
        {view === "journey" && (
          <>
            <div className="rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 text-white p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-200 shrink-0" />
                <div>
                  <p className="font-black text-sm">رحلتك في {books.length} مقرر</p>
                  <p className="text-[11px] text-indigo-100 mt-0.5">
                    أكملت {summary.completedCount} من {summary.lessons.length} درس · {summary.badgesCount} شارة · {summary.giftsCount} هدية
                  </p>
                </div>
              </div>
            </div>

            {summary.lessons.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 mt-3">لا توجد دروس بعد. اطلب من معلمك رفع كتاب أو إضافتها.</p>
              </div>
            )}

            {summary.lessons.map((state, index) => {
              const tags: Record<string, string> = {
                جديد: "bg-slate-100 text-slate-600", تقوية: "bg-rose-100 text-rose-700",
                مراجعة: "bg-amber-100 text-amber-700", إتقان: "bg-emerald-100 text-emerald-700",
                ممتاز: "bg-violet-100 text-violet-700",
              };
              return (
                <button key={state.lessonId} onClick={() => void handleOpenLesson(state.lessonId, state.unlocked)}
                  className={`w-full text-right bg-white rounded-2xl border p-4 shadow-2xs transition-all active:scale-[0.99] ${
                    state.unlocked ? "border-slate-200 hover:border-emerald-400" : "border-slate-100 opacity-70"
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      state.complete ? "bg-emerald-600 text-white" : state.unlocked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                    }`}>
                      {state.unlocked ? (state.complete ? <CheckCircle2 className="w-5 h-5" /> : index + 1) : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{state.lessonTitle}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{state.bookTitle}</p>
                        </div>
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${tags[state.recommendation]}`}>
                          {state.recommendation}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {state.read ? "قرأته" : "لم تقرأه"}</span>
                        {state.cardsTotal > 0 && <span className="flex items-center gap-1">🧠 {state.mastered}/{state.cardsTotal} بطاقة</span>}
                        {state.quizBest > 0 && <span className="flex items-center gap-1">✅ اختبار {state.quizBest}%</span>}
                      </div>
                      <div className="h-1.5 mt-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${state.complete ? 100 : state.quizBest || (state.read ? 20 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {view === "lesson" && (
          selectedLesson && lessonContent ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setView("journey")} className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-black text-sm text-slate-900 truncate">{selectedLesson.title}</h2>
                    <p className="text-[10px] text-slate-400 truncate">{selectedLesson.unitTitle}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                  {([
                    { id: "summary", label: "الملخص", icon: BookOpen },
                    { id: "flashcards", label: "البطاقات", icon: UserRound },
                    { id: "quiz", label: "الاختبار", icon: Award },
                    { id: "simplifiedExplanation", label: "تبسيط", icon: Sparkles },
                    { id: "glossary", label: "مصطلحات", icon: BookOpen },
                  ] as { id: LessonTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => {
                    const exists = !!lessonContent[id];
                    return (
                      <button key={id} disabled={!exists} onClick={() => setLessonTab(id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                          lessonTab === id && exists ? "bg-emerald-600 text-white" : exists ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-300"
                        }`}>
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!lessonContent[lessonTab] ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <Sparkles className="w-9 h-9 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 mt-3">هذا التبويب لم يُجهَّز بعد. اطلب من معلمك توليده.</p>
                </div>
              ) : lessonTab === "summary" ? (
                <TabRendererSummary content={lessonContent.summary?.content || ""} lessonTitle={selectedLesson.title} />
              ) : lessonTab === "flashcards" ? (
                <TabRendererFlashcards data={lessonContent.flashcards?.data} onMasteryChange={handleCardMastery} />
              ) : lessonTab === "quiz" ? (
                <TabRendererQuiz data={lessonContent.quiz?.data} onResult={handleQuizResult} />
              ) : lessonTab === "simplifiedExplanation" ? (
                <TabRendererSimplified content={lessonContent.simplifiedExplanation?.content || ""} />
              ) : (
                <TabRendererGlossary data={lessonContent.glossary?.data} />
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Play className="w-9 h-9 text-emerald-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 mt-3">اختر درسًا من مسارك</p>
              <button onClick={() => setView("journey")} className="mt-3 text-xs font-bold text-emerald-700">
                اذهب إلى مساري ←
              </button>
            </div>
          )
        )}

        {view === "badges" && (
          <>
            <div className="rounded-2xl bg-linear-to-r from-amber-400 to-orange-500 text-white p-4">
              <p className="font-black text-sm flex items-center gap-2"><Award className="w-5 h-5" /> خزانة الشارات</p>
              <p className="text-[11px] mt-1">جمعت {summary.badgesCount} من {BADGES.length} شارة</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((badge) => {
                const earned = progress?.badges.find((b) => b.id === badge.id);
                return (
                  <div key={badge.id} className={`rounded-2xl border p-4 text-center ${earned ? "bg-white border-emerald-200 shadow-xs" : "bg-slate-100/70 border-slate-200 opacity-60"}`}>
                    <div className="text-3xl">{earned ? badge.icon : "🔒"}</div>
                    <p className="font-bold text-xs text-slate-800 mt-2">{badge.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{badge.description}</p>
                    {earned && <p className="text-[9px] text-emerald-600 mt-2 font-bold">
                      {new Date(earned.at).toLocaleDateString("ar-EG")}
                    </p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "gifts" && (
          <>
            <div className="rounded-2xl bg-linear-to-r from-violet-500 to-fuchsia-600 text-white p-4">
              <p className="font-black text-sm flex items-center gap-2"><Gift className="w-5 h-5" /> صندوق المفاجآت</p>
              <p className="text-[11px] mt-1">كل هدية وصلتك بعد إنجاز أو ترقية مستوى — {summary.giftsCount} هدية حتى الآن</p>
            </div>
            {progress?.gifts.length ? (
              <div className="grid grid-cols-2 gap-3">
                {progress.gifts.map((gift) => (
                  <div key={gift.id} className="bg-white rounded-2xl border border-amber-200 p-4 text-center shadow-xs">
                    <div className="text-3xl">{gift.icon}</div>
                    <p className="font-black text-xs text-slate-800 mt-2">{gift.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{gift.message}</p>
                    <p className="text-[9px] text-amber-600 mt-2 font-bold">{gift.reason} · {new Date(gift.at).toLocaleDateString("ar-EG")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 mt-3">لم تصل هدايا بعد. أكمل اختبارًا أو اجمع شارة وستفاجئك هدية!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* modal تبديل الملفات */}
      {showProfiles && (
        <div className="absolute inset-0 z-60 bg-slate-950/50 flex items-end" onClick={() => setShowProfiles(false)}>
          <div className="w-full bg-white rounded-t-3xl p-5 space-y-3 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> الملفات على هذا الجهاز</h3>
              <button onClick={() => setShowProfiles(false)} className="p-1.5 rounded-lg bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            {profiles.map((p) => (
              <button key={p.id} onClick={() => { setActiveProfileId(p.id); setShowProfiles(false); void reload(p); setView("journey"); }}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-right ${p.id === profile.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                <span className="text-2xl">{p.avatar}</span>
                <span className="flex-1 font-bold text-sm text-slate-800">{p.name}</span>
                {p.id === profile.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>
            ))}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700">إضافة ملف جديد</p>
              <div className="flex gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="الاسم"
                  className="flex-1 min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                <button onClick={() => void handleCreateProfile()} className="rounded-xl bg-emerald-600 text-white px-4 text-xs font-bold">إضافة</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map((a) => (
                  <button key={a} onClick={() => setNewAvatar(a)} className={`w-8 h-8 rounded-lg text-lg ${newAvatar === a ? "bg-emerald-100 ring-2 ring-emerald-500" : ""}`}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* احتفال الإنجاز/الهدية */}
      {celebration && (
        <div className="absolute inset-0 z-70 bg-slate-950/60 flex items-center justify-center p-5" onClick={() => setCelebration(null)}>
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => { e.stopPropagation(); confetti({ particleCount: 110, spread: 75, origin: { y: 0.55 } }); }}>
            <div className="text-5xl">{celebration.gift?.icon || "🎉"}</div>
            <h3 className="font-black text-lg text-slate-900 mt-3">
              {celebration.levelAfter > celebration.levelBefore ? "ترقية مستوى!" : celebration.newBadges.length ? "إنجاز جديد!" : "أحسنت!"}
            </h3>
            {celebration.gift && <p className="text-xs font-bold text-violet-700 mt-1">{celebration.gift.title} — {celebration.gift.message}</p>}
            {celebration.newBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {celebration.newBadges.map((b) => (
                  <span key={b.id} className="text-[11px] bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-bold">{b.icon} {b.title}</span>
                ))}
              </div>
            )}
            {celebration.xpGained > 0 && <p className="text-xs text-emerald-700 font-bold mt-3">+{celebration.xpGained} نقطة ⚡</p>}
            <button onClick={() => setCelebration(null)} className="mt-5 w-full rounded-xl bg-emerald-600 text-white font-bold text-sm py-3">
              متابعة المذاكرة
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-5 inset-x-5 z-80 bg-slate-900 text-white text-center text-xs rounded-xl px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
