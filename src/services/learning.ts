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

/**
 * متجر هدايا المطوّر — هدايا افتراضية فقط، يُعدّل المطوّر قائمتها وتكلفتها هنا.
 * التكلفة بالpoint؛ كل نشاط يمنح نقاطًا دائمة تُستبدل بهذه الهدايا.
 */
export interface DevGiftDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  cost: number;
  tag?: string;
}

export const DEV_GIFTS: DevGiftDef[] = [
  { id: "star", icon: "⭐", title: "نجمة ذهبية", description: "نجمة تلمع في خزانتك كلما تقدّمت.", cost: 20, tag: "الأقرب" },
  { id: "balloon", icon: "🎈", title: "بالون احتفال", description: "ارفع بالونك في أي وقت احتفالًا بإنجازك.", cost: 25 },
  { id: "rainbow", icon: "🌈", title: "قوس قزح", description: "تذكير جميل أن بعد المراجعة يظهر الضوء.", cost: 35 },
  { id: "rocket", icon: "🚀", title: "صاروخ التقدّم", description: "مركبتك الخاصة في رحلة المذاكرة.", cost: 60 },
  { id: "theme", icon: "🎨", title: "ثيم ألوان مميز", description: "مظهر جديد لواجهتك في وضع الطالب.", cost: 75 },
  { id: "tune", icon: "🎵", title: "نغمة احتفال", description: "نغمة خاصة تُفتح مع كل هدية.", cost: 80 },
  { id: "unicorn", icon: "🦄", title: "يونيكورن النجوم", description: "هدية نادرة للمذاكرين المتفوقين.", cost: 90, tag: "نادر" },
  { id: "frame", icon: "🖼️", title: "إطار شارة ذهبي", description: "إطار فاخر يليق بشاراتك.", cost: 110 },
  { id: "title", icon: "🏅", title: "لقب نجم الصف", description: "لقب يظهر بجانب اسمك في رحلتك.", cost: 150, tag: "مميز" },
  { id: "mystery", icon: "🎁", title: "صندوق المفاجأة الكبرى", description: "هدية سرية اختارها المطوّر لك.", cost: 200, tag: "غامض" },
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

// ─── مهمة اليوم وسلسلة الانتصارات (محرك الفضول) ─────────────────────────
export type MissionType = "quiz" | "cards" | "read";
export interface MissionDef { type: MissionType; target: number; title: string; icon: string; hint: string }

const MISSIONS: MissionDef[] = [
  { type: "read", target: 1, title: "افتح درسًا جديدًا اليوم", icon: "📖", hint: "كل باب تفتحه يكشف سرًا جديدًا" },
  { type: "cards", target: 3, title: "أتقن ٣ بطاقات استذكار", icon: "🧠", hint: "البطاقات هي مفتاح التذكر السريع" },
  { type: "quiz", target: 1, title: "انجح في اختبار بـ ٧٠٪", icon: "✅", hint: "الاختبار يخبرك بما أتقنته فعلًا" },
];
const MISSION_BONUS = 12;
const STREAK_BONUS = 10;

/** مهمة اليوم تتناوب حسب اليوم — فيبقى هناك سبب جديد للعودة غدًا. */
export function missionOfDay(date = todayKey()): MissionDef {
  return MISSIONS[dayNumber(date) % MISSIONS.length];
}

function freshMission(): NonNullable<StudentProgress["dailyMission"]> {
  const def = missionOfDay();
  return { date: todayKey(), type: def.type, target: def.target, progress: 0, done: false, claimed: false };
}

function freshCounters(): NonNullable<StudentProgress["dailyCounters"]> {
  return { date: todayKey(), reads: 0, cardsMastered: 0, quizzesPassed: 0 };
}

function countersFor(progress: StudentProgress): NonNullable<StudentProgress["dailyCounters"]> {
  if (!progress.dailyCounters || progress.dailyCounters.date !== todayKey()) {
    progress.dailyCounters = freshCounters();
  }
  return progress.dailyCounters;
}

function counterValue(c: NonNullable<StudentProgress["dailyCounters"]>, type: MissionType): number {
  return type === "quiz" ? c.quizzesPassed : type === "cards" ? c.cardsMastered : c.reads;
}

/** يُستدعى بعد زيادة العدّادات: يربط المهمة بعدادها ويقرر إن استحقت المكافأة. */
function resolveMission(progress: StudentProgress): { def: MissionDef; reward: boolean } {
  const today = todayKey();
  const def = missionOfDay(today);
  const counters = countersFor(progress);
  if (!progress.dailyMission || progress.dailyMission.date !== today) {
    progress.dailyMission = freshMission();
  }
  const mission = progress.dailyMission;
  mission.type = def.type;
  mission.target = def.target;
  mission.progress = counterValue(counters, def.type);
  mission.done = mission.progress >= mission.target;
  return { def, reward: mission.done && !mission.claimed };
}

/** انتصار = اختبار ناجح أو إتقان بطاقات. كل ٣ انتصارات مكافأة إضافية. */
function bumpWinStreak(progress: StudentProgress, won: boolean) {
  progress.winStreak = won ? (progress.winStreak || 0) + 1 : 0;
  const streak = progress.winStreak || 0;
  const milestone = won && streak > 0 && streak % 3 === 0;
  return { streak, milestone, bonus: milestone ? STREAK_BONUS : 0 };
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
    redeemedGifts: [],
    history: [],
    giftPoints: 0,
    lifetimePoints: 0,
    lastActiveDate: "",
    streak: 0,
    dailyMission: freshMission(),
    dailyCounters: freshCounters(),
    winStreak: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getProgress(profileId: string): Promise<StudentProgress> {
  const row = (await localDb.kvGet(PROGRESS_STORE, profileId)) as StudentProgress | null;
  const progress = row && row.id ? row : emptyProgress(profileId);
  // ترحيل هادئ للملفات المحفوظة قبل إضافة مهمة اليوم — بلا تغيير رقم قاعدة البيانات.
  let dirty = !row || !row.id;
  if (!progress.dailyMission || progress.dailyMission.date !== todayKey()) {
    progress.dailyMission = freshMission();
    dirty = true;
  }
  if (!progress.dailyCounters || progress.dailyCounters.date !== todayKey()) {
    progress.dailyCounters = freshCounters();
    dirty = true;
  }
  if (typeof progress.winStreak !== "number") { progress.winStreak = 0; dirty = true; }
  // ترحيل رصيد الهدايا: كل نقاط التعلّم السابقة تُصبح قابلة للاستبدال فلا يضيع شيء.
  if (typeof progress.giftPoints !== "number") {
    progress.giftPoints = progress.earnedXp || 0;
    dirty = true;
  }
  if (typeof progress.lifetimePoints !== "number") {
    progress.lifetimePoints = Math.max(progress.giftPoints, progress.earnedXp || 0);
    dirty = true;
  }
  if (!Array.isArray(progress.redeemedGifts)) { progress.redeemedGifts = []; dirty = true; }
  if (dirty) await localDb.kvPut(PROGRESS_STORE, progress);
  return progress;
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
    giftPoints: progress.giftPoints || 0,
    lifetimePoints: progress.lifetimePoints || 0,
    redeemedGiftsCount: (progress.redeemedGifts || []).length,
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
  if (amount > 0) {
    progress.history.unshift({ id: uid("h"), text, xp: amount, at: new Date().toISOString() });
    progress.history = progress.history.slice(0, 60);
  }
}

/**
 * نقاط الهدايا رصيد مستقل عن نقاط المستوى: تُجمع من كل نشاط ولا تُصفَّر عند الترقية،
 * ولا تُنقص إلا عند استبدالها بهدية من متجر المطوّر.
 */
function addPoints(progress: StudentProgress, amount: number, text: string): void {
  if (amount <= 0) return;
  progress.giftPoints = (progress.giftPoints || 0) + amount;
  progress.lifetimePoints = (progress.lifetimePoints || 0) + amount;
  progress.history.unshift({ id: uid("p"), text: `🎁 ${text}`, xp: amount, at: new Date().toISOString() });
  progress.history = progress.history.slice(0, 60);
}

/** إجمالي نقاط بيانات الطالب لدى المعلم (حضور/درجات/واجبات). */
function signalTotals(profile: StudentProfile, ctx: SummaryContext) {
  const ids = resolveStudentIds(profile, ctx.students);
  let attendance = 0;
  let grades = 0;
  let homework = 0;
  ctx.attendance.forEach((rec) => ids.forEach((id) => {
    if (rec.records?.[id] === "present") attendance += 6;
    else if (rec.records?.[id] === "late") attendance += 2;
  }));
  ctx.grades.forEach((g) => {
    if (!ids.includes(g.studentId) || !g.maxScore) return;
    grades += Math.min(10, Math.max(0, Math.round((g.score / g.maxScore) * 10)));
  });
  ctx.homework.forEach((hw) => {
    if ((hw.submitted || []).some((id) => ids.includes(id))) homework += 8;
  });
  return { attendance, grades, homework, total: attendance + grades + homework };
}

/**
 * يُستدعى عند تحميل مسار الطالب أو لوحة المعلم: يمنح نقاط هدايا عن أي بيانات معلم
 * جديدة (حضور، درجة، واجب) مرة واحدة فقط، فتدخل «كل البيانات المتاحة» في الرصيد.
 */
export async function syncTeacherRewards(profile: StudentProfile, ctx: SummaryContext): Promise<number> {
  const progress = await getProgress(profile.id);
  const current = signalTotals(profile, ctx);
  const previous = progress.countedSignals;
  if (previous && previous.attendance === current.attendance
    && previous.grades === current.grades && previous.homework === current.homework) return 0;

  progress.countedSignals = current;
  const gained = previous ? Math.max(0, current.total - previous.total) : current.total;
  if (gained > 0) addPoints(progress, gained, "حضور ودرجات وواجبات جديدة من المعلم");
  await saveProgress(progress);
  return gained;
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
  /** كل المفاجآت التي وصلت دفعة واحدة (قد تكون أكثر من هدية). */
  allGifts: StudentProgress["gifts"];
  missionDone: boolean;
  missionXp: number;
  streak: number;
  streakBonus: number;
  /** نقاط الهدايا المضافة في هذا الحدث — تحتسب دائمًا وتُحتفظ بها للاستبدال. */
  pointsGained: number;
  pointsBalance: number;
  weakQuiz: boolean;
  strongQuiz: boolean;
}

interface EventExtras {
  missionXp?: number;
  missionDone?: boolean;
  streak?: number;
  streakBonus?: number;
  streakMilestone?: boolean;
  /** نقاط مشاركة إضافية تُمنح مع كل نشاط حتى لو كانت نقاط المستوى صفرًا. */
  points?: number;
  weakQuiz?: boolean;
  strongQuiz?: boolean;
}

async function finishEvent(
  profile: StudentProfile,
  progress: StudentProgress,
  ctx: SummaryContext,
  xpGained: number,
  text: string,
  extras: EventExtras = {}
): Promise<LearningEventResult> {
  // progress.earnedXp ما زال قبل إضافة نقاط هذا الحدث — هنا نحسب المستوى الحالي.
  const levelBefore = summarize(profile, progress, ctx).level;
  touchDay(progress);
  const bonusXp = (extras.missionXp || 0) + (extras.streakBonus || 0);
  addXp(progress, xpGained + bonusXp, text);
  // كل نشاط يمنح نقاط هدايا: نقاط الإنجاز + مكافآت اليوم + نقاط المشاركة.
  const pointsGained = Math.max(0, xpGained) + bonusXp + (extras.points || 0);
  addPoints(progress, pointsGained, text);
  const summary = summarize(profile, progress, ctx);
  const levelAfter = summary.level;
  const newBadges = evaluateBadges(progress, summary, ctx, profile);

  const gifts: StudentProgress["gifts"] = [];
  if (levelAfter > levelBefore) gifts.push(randomGift(`ترقّيت إلى المستوى ${levelAfter}`));
  if (newBadges.length > 0) gifts.push(randomGift(`إنجاز جديد: ${newBadges[0].title}`));
  if (extras.missionDone) gifts.push(randomGift("مكافأة مهمة اليوم"));
  if (extras.streakMilestone) gifts.push(randomGift(`سلسلة ${extras.streak} انتصار`));
  if (!gifts.length && Math.random() < 0.18) gifts.push(randomGift("مفاجأة صغيرة من رحلتك اليوم"));
  if (gifts.length) progress.gifts.unshift(...gifts);
  if (extras.missionDone && progress.dailyMission) progress.dailyMission.claimed = true;

  await saveProgress(progress);
  return {
    xpGained,
    levelBefore,
    levelAfter,
    newBadges,
    gift: gifts[0] || null,
    allGifts: gifts,
    missionDone: !!extras.missionDone,
    missionXp: extras.missionXp || 0,
    streak: extras.streak || progress.winStreak || 0,
    streakBonus: extras.streakBonus || 0,
    pointsGained,
    pointsBalance: progress.giftPoints || 0,
    weakQuiz: !!extras.weakQuiz,
    strongQuiz: !!extras.strongQuiz,
  };
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
  countersFor(progress).reads++;
  const daily = resolveMission(progress);
  return finishEvent(profile, progress, ctx, 0, `قرأت «${lesson.title}»`, {
    missionXp: daily.reward ? MISSION_BONUS : 0,
    missionDone: daily.reward,
    points: 5,
  });
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
  if (best >= 70) countersFor(progress).quizzesPassed++;
  const win = bumpWinStreak(progress, best >= 70);
  const daily = resolveMission(progress);
  return finishEvent(profile, progress, ctx, xp, `اختبار «${lesson.title}» — ${best}%`, {
    missionXp: daily.reward ? MISSION_BONUS : 0,
    missionDone: daily.reward,
    streak: win.streak,
    streakBonus: win.bonus,
    streakMilestone: win.milestone,
    points: best >= 90 ? 15 : best >= 70 ? 10 : 4,
    weakQuiz: best > 0 && best < 70,
    strongQuiz: best >= 90,
  });
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
  let xp = (mastered - old) * 2;
  let text = `بطاقات «${lesson.title}»: ${mastered}/${total}`;
  if (!progress.completedLessons.includes(lesson.id)) {
    const after = summarize(profile, progress, ctx).lessons.find((l) => l.lessonId === lesson.id);
    if (after?.complete) {
      progress.completedLessons.push(lesson.id);
      xp += 15;
      text = `إتقان بطاقات «${lesson.title}»`;
    }
  }
  countersFor(progress).cardsMastered += mastered - old;
  const win = bumpWinStreak(progress, mastered >= Math.ceil(total * 0.8));
  const daily = resolveMission(progress);
  return finishEvent(profile, progress, ctx, xp, text, {
    missionXp: daily.reward ? MISSION_BONUS : 0,
    missionDone: daily.reward,
    streak: win.streak,
    streakBonus: win.bonus,
    streakMilestone: win.milestone,
    points: 3 + Math.min(10, mastered - old),
  });
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

// ─── متجر هدايا المطوّر ──────────────────────────────────────────────────
export interface RedeemResult {
  ok: boolean;
  gift: DevGiftDef | null;
  item: StudentProgress["redeemedGifts"][number] | null;
  pointsLeft: number;
  message: string;
}

/** استبدال رصيد النقاط بهدية افتراضية من كتالوج المطوّر — النقاط لا تضيع بل تتحول إلى هدية. */
export async function redeemGift(profile: StudentProfile, giftId: string): Promise<RedeemResult> {
  const progress = await getProgress(profile.id);
  const balance = progress.giftPoints || 0;
  const gift = DEV_GIFTS.find((g) => g.id === giftId);
  if (!gift) return { ok: false, gift: null, item: null, pointsLeft: balance, message: "هذه الهدية غير متاحة الآن" };
  if (balance < gift.cost) {
    return { ok: false, gift, item: null, pointsLeft: balance, message: `تحتاج ${gift.cost - balance} نقطة إضافية لهذه الهدية` };
  }

  let { icon, title } = gift;
  let message = gift.description;
  if (gift.id === "mystery") {
    const surprise = GIFTS[Math.floor(Math.random() * GIFTS.length)];
    icon = surprise.icon; title = surprise.title; message = surprise.message;
  }
  if (!Array.isArray(progress.redeemedGifts)) progress.redeemedGifts = [];
  const item = {
    id: uid("redeem"), giftId: gift.id, icon, title, message,
    cost: gift.cost, at: new Date().toISOString(),
  };
  progress.redeemedGifts.unshift(item);
  progress.giftPoints = balance - gift.cost;
  await saveProgress(progress);
  return {
    ok: true, gift, item, pointsLeft: progress.giftPoints,
    message: `تم استبدال الهدية! تبقّى معك ${progress.giftPoints} نقطة للهدية القادمة`,
  };
}
