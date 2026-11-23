// مسار الطالب: مستويات، نقاط، إنجازات وهدايا افتراضية — كلها محلية على الجهاز.
// البيانات تُخزَّن في متجري KV «profiles» و«progress» فتدخل النسخة الاحتياطية تلقائياً.
import {
  Book,
  Lesson,
  Student,
  AttendanceRecord,
  GradeEntry,
  HomeworkItem,
  StudentProfile,
  StudentProgress,
  LessonJourneyState,
  ProgressSummary,
} from "../types";
import { localDb } from "./db";

const PROFILES_STORE = "profiles";
const PROGRESS_STORE = "progress";
const ACTIVE_KEY = "mahdara.studentProfileId";

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first_step", title: "الخطوة الأولى", description: "افتح أول درس في مسارك", icon: "🌱", color: "emerald" },
  { id: "quiz_pass", title: "ناجح", description: "انجح في اختبار درس بـ ٧٠٪ أو أكثر", icon: "✅", color: "teal" },
  { id: "quiz_star", title: "نجم الاختبار", description: "حقق ٩٠٪ في اختبار درس", icon: "⭐", color: "amber" },
  { id: "card_master", title: "سيد البطاقات", description: "أتقن كل بطاقات درس واحد", icon: "🧠", color: "indigo" },
  { id: "streak_3", title: "مواظب", description: "ذاكر ٣ أيام متتالية", icon: "🔥", color: "rose" },
  { id: "level_3", title: "صاعد", description: "اصل إلى المستوى الثالث", icon: "🚀", color: "sky" },
  { id: "level_5", title: "بطل المسار", description: "اصل إلى المستوى الخامس", icon: "🏆", color: "violet" },
  { id: "five_lessons", title: "رحّالة", description: "أكمل ٥ دروس في مسارك", icon: "🗺️", color: "emerald" },
  { id: "homework_hero", title: "منجِز الواجبات", description: "سلّم ٥ واجبات", icon: "📚", color: "teal" },
];

const GIFTS: { icon: string; title: string; message: string }[] = [
  { icon: "🌟", title: "نجمة ذهبية", message: "أحسنت! أضفت نجمة جديدة إلى سمائك." },
  { icon: "🎁", title: "صندوق مفاجأة", message: "مفاجأة صغيرة تذكّرك أنك تتقدّم كل يوم." },
  { icon: "🚀", title: "صاروخ التقدّم", message: "انطلق! مستواك يرتفع درسًا بعد درس." },
  { icon: "🦄", title: "يونيكورن النجوم", message: "هدية نادرة لمذاكر مجتهد!" },
  { icon: "💎", title: "ماسة صغيرة", message: "كل إجابة صحيحة تصقل موهبتك." },
  { icon: "🌈", title: "قوس قزح", message: "بعد كل مراجعة يظهر الضوء." },
  { icon: "🍀", title: "ورقة حظ", message: "حظك في الدرس القادم مضمون!" },
  { icon: "🎈", title: "بالون احتفال", message: "اهتف قليلاً — أنت تتقن المادة." },
  { icon: "🐣", title: "صديق جديد", message: "انضم إليك رفيق صغير في رحلة المذاكرة." },
  { icon: "🏅", title: "ميدالية الشجاعة", message: "الشجاعة أن تعيد المحاولة بعد الخطأ." },
];

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayNumber(key: string): number {
  return Math.floor(new Date(`${key}T00:00:00`).getTime() / 86400000);
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── المستويات ───────────────────────────────────────────────────────────
export function xpForLevel(level: number): number {
  return 40 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 99 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

// ─── الملفات الشخصية ─────────────────────────────────────────────────────
export async function getProfiles(): Promise<StudentProfile[]> {
  const rows = (await localDb.kvGetAll(PROFILES_STORE)) as StudentProfile[];
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveProfile(profile: StudentProfile): Promise<void> {
  await localDb.kvPut(PROFILES_STORE, profile);
}

export async function deleteProfile(profileId: string): Promise<void> {
  await localDb.kvDelete(PROFILES_STORE, profileId);
  await localDb.kvDelete(PROGRESS_STORE, profileId);
}

export function getActiveProfileId(): string {
  try { return localStorage.getItem(ACTIVE_KEY) || ""; } catch { return ""; }
}

export function setActiveProfileId(id: string): void {
  try { id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}

// ─── سجل التقدّم ─────────────────────────────────────────────────────────
export function emptyProgress(profileId: string): StudentProgress {
  return {
    id: profileId,
    profileId,
    earnedXp: 0,
    quiz: {},
    flashcards: {},
    openedLessons: {},
    completedLessons: [],
    badges: [],
    gifts: [],
    history: [],
    lastActiveDate: "",
    streak: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getProgress(profileId: string): Promise<StudentProgress> {
  const row = (await localDb.kvGet(PROGRESS_STORE, profileId)) as StudentProgress | null;
  if (row && row.id) return row;
  const fresh = emptyProgress(profileId);
  await localDb.kvPut(PROGRESS_STORE, fresh);
  return fresh;
}

export async function saveProgress(progress: StudentProgress): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  await localDb.kvPut(PROGRESS_STORE, progress);
}

// ─── حساب الملخص ─────────────────────────────────────────────────────────
export interface SummaryContext {
  books: Book[];
  lessons: Lesson[];
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
  homework: HomeworkItem[];
}

function resolveStudentIds(profile: StudentProfile, students: Student[]): string[] {
  const ids = new Set<string>();
  if (profile.studentId) ids.add(profile.studentId);
  students.filter((s) => s.name.trim() === profile.name.trim()).forEach((s) => ids.add(s.id));
  return [...ids];
}

function orderedLessons(books: Book[], lessons: Lesson[]): Lesson[] {
  const bookOrder = new Map(books.map((b, i) => [b.id, i]));
  return [...lessons].sort((a, b) => {
    const ba = bookOrder.get(a.bookId) ?? 999;
    const bb = bookOrder.get(b.bookId) ?? 999;
    if (ba !== bb) return ba - bb;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export function summarize(
  profile: StudentProfile,
  progress: StudentProgress,
  ctx: SummaryContext
): ProgressSummary {
  const ids = resolveStudentIds(profile, ctx.students);
  let baseXp = 0;
  let presentCount = 0;
  let absentCount = 0;
  let homeworkCount = 0;

  ctx.attendance.forEach((rec) => {
    ids.forEach((id) => {
      const status = rec.records?.[id];
      if (status === "present") { baseXp += 6; presentCount++; }
      if (status === "late") baseXp += 2;
      if (status === "absent") absentCount++;
    });
  });
  ctx.grades.forEach((g) => {
    if (!ids.includes(g.studentId) || !g.maxScore) return;
    baseXp += Math.min(10, Math.max(0, Math.round((g.score / g.maxScore) * 10)));
  });
  ctx.homework.forEach((hw) => {
    if ((hw.submitted || []).some((id) => ids.includes(id))) { baseXp += 8; homeworkCount++; }
  });

  const totalXp = baseXp + (progress.earnedXp || 0);
  const level = levelFromXp(totalXp);
  const xpInLevel = totalXp - xpForLevel(level);
  const xpToNext = Math.max(1, xpForLevel(level + 1) - totalXp);

  const ordered = orderedLessons(ctx.books, ctx.lessons);
  const bookTitles = new Map(ctx.books.map((b) => [b.id, b.title]));
  const lessonStates: LessonJourneyState[] = ordered.map((lesson) => {
    const quiz = progress.quiz[lesson.id];
    const cards = progress.flashcards[lesson.id];
    const hasQuiz = !!lesson.generatedTabs?.quiz;
    const hasCards = !!lesson.generatedTabs?.flashcards;
    const cardsRatio = cards && cards.total > 0 ? cards.mastered / cards.total : 0;
    const quizBest = quiz?.best || 0;
    const read = !!progress.openedLessons[lesson.id];
    const complete = read &&
      (!hasQuiz || quizBest >= 70) &&
      (!hasCards || cardsRatio >= 0.8);
    let recommendation: LessonJourneyState["recommendation"] = "جديد";
    if (quizBest >= 90 && complete) recommendation = "ممتاز";
    else if (complete) recommendation = "إتقان";
    else if (quizBest >= 50) recommendation = "مراجعة";
    else if (quizBest > 0) recommendation = "تقوية";
    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      bookTitle: bookTitles.get(lesson.bookId) || "",
      read,
      quizBest,
      mastered: cards?.mastered || 0,
      cardsTotal: cards?.total || 0,
      complete,
      recommendation,
      unlocked: false,
    };
  });

  lessonStates.forEach((state, i) => {
    state.unlocked = i === 0 || lessonStates[i - 1].complete;
  });
  const next = lessonStates.find((s) => s.unlocked && !s.complete);

  return {
    totalXp,
    baseXp,
    earnedXp: progress.earnedXp || 0,
    level,
    xpInLevel,
    xpToNext,
    streak: progress.streak || 0,
    completedCount: lessonStates.filter((s) => s.complete).length,
    badgesCount: progress.badges.length,
    giftsCount: progress.gifts.length,
    lessons: lessonStates,
    nextLessonId: next?.lessonId || null,
  };
}

// ─── الأحداث ─────────────────────────────────────────────────────────────
function touchDay(progress: StudentProgress): void {
  const today = todayKey();
  if (progress.lastActiveDate === today) return;
  const gap = progress.lastActiveDate ? dayNumber(today) - dayNumber(progress.lastActiveDate) : 99;
  progress.streak = gap === 1 ? (progress.streak || 0) + 1 : 1;
  progress.lastActiveDate = today;
}

function addXp(progress: StudentProgress, amount: number, text: string): void {
  progress.earnedXp += amount;
  progress.history.unshift({ id: uid("h"), text, xp: amount, at: new Date().toISOString() });
  progress.history = progress.history.slice(0, 60);
}

function evaluateBadges(
  progress: StudentProgress,
  summary: ProgressSummary,
  ctx: SummaryContext,
  profile: StudentProfile
): BadgeDef[] {
  const earned = new Set(progress.badges.map((b) => b.id));
  const ids = resolveStudentIds(profile, ctx.students);
  const hwDone = ctx.homework.filter((hw) => (hw.submitted || []).some((id) => ids.includes(id))).length;
  const attended = ctx.attendance.some((rec) => ids.some((id) => rec.records?.[id] === "present"));
  const absent = ctx.attendance.some((rec) => ids.some((id) => rec.records?.[id] === "absent"));

  const candidates: Record<string, boolean> = {
    first_step: Object.keys(progress.openedLessons).length > 0,
    quiz_pass: Object.values(progress.quiz).some((q) => q.best >= 70),
    quiz_star: Object.values(progress.quiz).some((q) => q.best >= 90),
    card_master: Object.values(progress.flashcards).some((f) => f.total > 0 && f.mastered >= f.total),
    streak_3: (progress.streak || 0) >= 3,
    level_3: summary.level >= 3,
    level_5: summary.level >= 5,
    five_lessons: progress.completedLessons.length >= 5,
    homework_hero: hwDone >= 5,
    perfect_attendance: attended && !absent && ctx.attendance.length >= 3,
  };

  const fresh: BadgeDef[] = [];
  BADGES.forEach((badge) => {
    if (!earned.has(badge.id) && candidates[badge.id]) {
      progress.badges.push({ id: badge.id, at: new Date().toISOString() });
      fresh.push(badge);
    }
  });
  return fresh;
}

function randomGift(reason: string): StudentProgress["gifts"][number] {
  const gift = GIFTS[Math.floor(Math.random() * GIFTS.length)];
  return { id: uid("gift"), ...gift, reason, at: new Date().toISOString() };
}

export interface LearningEventResult {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newBadges: BadgeDef[];
  gift: StudentProgress["gifts"][number] | null;
}

async function finishEvent(
  profile: StudentProfile,
  progress: StudentProgress,
  ctx: SummaryContext,
  xpGained: number,
  text: string
): Promise<LearningEventResult> {
  // progress.earnedXp ما زال قبل إضافة نقاط هذا الحدث — هنا نحسب المستوى الحالي.
  const levelBefore = summarize(profile, progress, ctx).level;
  touchDay(progress);
  addXp(progress, xpGained, text);
  const summary = summarize(profile, progress, ctx);
  const levelAfter = summary.level;
  const newBadges = evaluateBadges(progress, summary, ctx, profile);
  let gift: StudentProgress["gifts"][number] | null = null;
  if (levelAfter > levelBefore) {
    gift = randomGift(`ترقّيت إلى المستوى ${levelAfter}`);
  } else if (newBadges.length > 0) {
    gift = randomGift(`إنجاز جديد: ${newBadges[0].title}`);
  } else if (xpGained >= 20 && Math.random() < 0.3) {
    gift = randomGift("مفاجأة بعد إجابات رائعة");
  }
  if (gift) progress.gifts.unshift(gift);
  await saveProgress(progress);
  return { xpGained, levelBefore, levelAfter, newBadges, gift };
}

export async function markLessonOpen(
  profile: StudentProfile,
  lesson: Lesson,
  ctx: SummaryContext
): Promise<LearningEventResult | null> {
  const progress = await getProgress(profile.id);
  const today = todayKey();
  if (progress.openedLessons[lesson.id] === today) return null;
  progress.openedLessons[lesson.id] = today;
  touchDay(progress);
  await saveProgress(progress);
  const summary = summarize(profile, progress, ctx);
  const fresh = evaluateBadges(progress, summary, ctx, profile);
  let gift: StudentProgress["gifts"][number] | null = null;
  if (fresh.length) {
    gift = randomGift(`إنجاز جديد: ${fresh[0].title}`);
    progress.gifts.unshift(gift);
    await saveProgress(progress);
  }
  return { xpGained: 0, levelBefore: summary.level, levelAfter: summary.level, newBadges: fresh, gift };
}

export async function recordQuiz(
  profile: StudentProfile,
  lesson: Lesson,
  percentage: number,
  ctx: SummaryContext
): Promise<LearningEventResult> {
  const progress = await getProgress(profile.id);
  const previous = progress.quiz[lesson.id]?.best || 0;
  const best = Math.max(previous, Math.round(percentage));
  progress.quiz[lesson.id] = {
    best,
    attempts: (progress.quiz[lesson.id]?.attempts || 0) + 1,
    lastAt: new Date().toISOString(),
  };
  let xp = best >= 90 ? 30 : best >= 70 ? 20 : best >= 50 ? 8 : 2;
  if (best > previous && previous > 0) xp += Math.min(5, Math.round((best - previous) / 5));
  if (!progress.completedLessons.includes(lesson.id)) {
    const after = summarize(profile, progress, ctx).lessons.find((l) => l.lessonId === lesson.id);
    if (after?.complete) {
      progress.completedLessons.push(lesson.id);
      xp += 15;
    }
  }
  return finishEvent(profile, progress, ctx, xp, `اختبار «${lesson.title}» — ${best}%`);
}

export async function recordFlashcards(
  profile: StudentProfile,
  lesson: Lesson,
  mastered: number,
  total: number,
  ctx: SummaryContext
): Promise<LearningEventResult | null> {
  if (total <= 0) return null;
  const progress = await getProgress(profile.id);
  const old = progress.flashcards[lesson.id]?.mastered || 0;
  if (mastered <= old) return null;
  progress.flashcards[lesson.id] = { mastered, total, lastAt: new Date().toISOString() };
  const xp = (mastered - old) * 2;
  if (!progress.completedLessons.includes(lesson.id)) {
    const after = summarize(profile, progress, ctx).lessons.find((l) => l.lessonId === lesson.id);
    if (after?.complete) {
      progress.completedLessons.push(lesson.id);
      return finishEvent(profile, progress, ctx, xp + 15, `إتقان بطاقات «${lesson.title}»`);
    }
  }
  return finishEvent(profile, progress, ctx, xp, `بطاقات «${lesson.title}»: ${mastered}/${total}`);
}

export async function loadSummaryContext(books: Book[], lessons: Lesson[]): Promise<SummaryContext> {
  const [students, attendance, grades, homework] = await Promise.all([
    localDb.kvGetAll("students") as Promise<Student[]>,
    localDb.kvGetAll("attendance") as Promise<AttendanceRecord[]>,
    localDb.kvGetAll("grades") as Promise<GradeEntry[]>,
    localDb.kvGetAll("homework") as Promise<HomeworkItem[]>,
  ]);
  return { books, lessons, students, attendance, grades, homework };
}
