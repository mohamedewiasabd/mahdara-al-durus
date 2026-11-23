export type TabId =
  | "summary"
  | "bulletPoints"
  | "mindMap"
  | "lessonPlan"
  | "quiz"
  | "glossary"
  | "activities"
  | "flashcards"
  | "criticalThinking"
  | "simplifiedExplanation"
  | "deepDive"
  | "teacherBriefing";

export interface TabDefinition {
  id: TabId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
}

export interface MindMapSubBranch {
  id: string;
  title: string;
  details?: string;
}

export interface MindMapBranch {
  id: string;
  title: string;
  color?: string;
  subBranches: MindMapSubBranch[];
}

export interface MindMapData {
  centerTopic: string;
  description?: string;
  branches: MindMapBranch[];
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "essay";
  question: string;
  options?: string[];
  correctIndex?: number;
  correctBoolean?: boolean;
  explanation?: string;
  modelAnswer?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface GlossaryTerm {
  term: string;
  category?: string;
  definition: string;
  example?: string;
  commonMistake?: string;
}

export interface GlossaryData {
  terms: GlossaryTerm[];
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category?: string;
}

export interface FlashcardsData {
  cards: FlashcardItem[];
}

export interface TabExplanationItem {
  id: string;
  selectedText: string;
  explanation: string;
  timestamp: string;
}

export interface TabContentRecord {
  format: "json" | "markdown";
  data?: any;
  content?: string;
  generatedAt: string;
  customPrompt?: string;
  explanations?: TabExplanationItem[];
}

export interface Lesson {
  id: string;
  bookId: string;
  unitTitle: string;
  title: string;
  summary: string;
  estimatedDuration: string;
  keyKeywords: string[];
  content: string;
  order: number;
  generatedTabs: Partial<Record<TabId, TabContentRecord>>;
  createdAt: string;
  updatedAt: string;
}

// ---- Teacher follow-up domain (Phase 3) ----
export interface StudentClass {
  id: string;
  name: string;
  subject?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  notes?: string;
  createdAt: string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  classId: string;
  lessonTitle: string;
  sessionLabel: string;
  date: string;
  records: Record<string, AttendanceStatus>;
}

export interface GradeEntry {
  id: string;
  classId: string;
  studentId: string;
  assessment: string;
  score: number;
  maxScore: number;
  note?: string;
  date: string;
}

export interface HomeworkItem {
  id: string;
  classId: string;
  lessonTitle: string;
  task: string;
  dueDate?: string;
  createdAt: string;
  submitted: string[];
}

export interface QuestionBankItem {
  id: string;
  lessonTitle: string;
  type: "mcq" | "true_false" | "essay";
  question: string;
  options?: string[];
  correctIndex?: number;
  correctBoolean?: boolean;
  modelAnswer?: string;
  explanation?: string;
  addedAt: string;
}

export interface SemesterWeek {
  week: number;
  title: string;
  lessons: string[];
  objectives: string[];
  activities: string[];
  homework: string[];
}

export interface SemesterPlan {
  id: string;
  bookId: string;
  bookTitle: string;
  planTitle: string;
  termLabel: string;
  weeksCount: number;
  weeks: SemesterWeek[];
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description: string;
  coverTheme: string; // e.g. 'emerald', 'indigo', 'amber', 'rose'
  createdAt: string;
  units: {
    unitTitle: string;
    lessonIds: string[];
  }[];
}

// ─── مسار الطالب: المستويات والإنجازات والهدايا (Phase 4) ───────────────
/** ملف طالب محلي مستقل — لا حساب ولا تسجيل دخول. */
export interface StudentProfile {
  id: string;
  name: string;
  avatar: string; // رمز تعبيري اختياري
  studentId?: string; // ربط اختياري بطالب المعلم في الفصل
  classId?: string;
  createdAt: string;
}

/** أفضل نتيجة اختبار لطالب في درس. */
export interface QuizBest {
  best: number; // 0..100
  attempts: number;
  lastAt: string;
}

/** إتقان بطاقات الاستذكار لطالب في درس. */
export interface FlashcardBest {
  mastered: number;
  total: number;
  lastAt: string;
}

/** سجل تقدّم طالب كامل (يُخزَّن كصف واحد في متجر KV «progress»). */
export interface StudentProgress {
  id: string; // = profileId
  profileId: string;
  earnedXp: number; // نقاط من أحداث التعلّم (لا تُحتسب مرتين)
  quiz: Record<string, QuizBest>; // مفتاحه lesson.id
  flashcards: Record<string, FlashcardBest>;
  openedLessons: Record<string, string>; // lesson.id → آخر تاريخ فتح
  completedLessons: string[];
  badges: { id: string; at: string }[];
  gifts: { id: string; icon: string; title: string; message: string; reason: string; at: string }[];
  history: { id: string; text: string; xp: number; at: string }[];
  lastActiveDate: string;
  streak: number;
  updatedAt: string;
}

/** حالة درس محسوبة للعرض في مسار الطالب. */
export interface LessonJourneyState {
  lessonId: string;
  lessonTitle: string;
  bookTitle: string;
  read: boolean;
  quizBest: number;
  mastered: number;
  cardsTotal: number;
  complete: boolean;
  recommendation: "جديد" | "تقوية" | "مراجعة" | "إتقان" | "ممتاز";
  unlocked: boolean;
}

/** نتيجة محسوبة للوحة الطالب/المعلم. */
export interface ProgressSummary {
  totalXp: number;
  baseXp: number;
  earnedXp: number;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  streak: number;
  completedCount: number;
  badgesCount: number;
  giftsCount: number;
  lessons: LessonJourneyState[];
  nextLessonId: string | null;
}
