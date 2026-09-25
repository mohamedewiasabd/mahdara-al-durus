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
