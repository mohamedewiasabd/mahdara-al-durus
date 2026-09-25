import { localDb } from "./db";
import {
  StudentClass,
  Student,
  AttendanceRecord,
  GradeEntry,
  HomeworkItem,
  QuestionBankItem,
  SemesterPlan,
} from "../types";

// ---------- Classes ----------
export async function getClasses(): Promise<StudentClass[]> {
  return (await localDb.kvGetAll("classes")) as StudentClass[];
}

export async function saveClass(cls: StudentClass): Promise<void> {
  await localDb.kvPut("classes", cls);
}

export async function deleteClass(id: string): Promise<void> {
  await localDb.kvDelete("classes", id);
  const students = await getStudents();
  for (const s of students.filter((s) => s.classId === id)) {
    await localDb.kvDelete("students", s.id);
  }
  const [att, gr, hw] = await Promise.all([
    localDb.kvGetAll("attendance"),
    localDb.kvGetAll("grades"),
    localDb.kvGetAll("homework"),
  ]);
  for (const r of att as AttendanceRecord[]) if (r.classId === id) await localDb.kvDelete("attendance", r.id);
  for (const r of gr as GradeEntry[]) if (r.classId === id) await localDb.kvDelete("grades", r.id);
  for (const r of hw as HomeworkItem[]) if (r.classId === id) await localDb.kvDelete("homework", r.id);
}

// ---------- Students ----------
export async function getStudents(classId?: string): Promise<Student[]> {
  const all = (await localDb.kvGetAll("students")) as Student[];
  return classId ? all.filter((s) => s.classId === classId) : all;
}

export async function saveStudent(student: Student): Promise<void> {
  await localDb.kvPut("students", student);
}

export async function deleteStudent(id: string): Promise<void> {
  await localDb.kvDelete("students", id);
}

// ---------- Attendance ----------
export async function getAttendance(classId?: string): Promise<AttendanceRecord[]> {
  const all = (await localDb.kvGetAll("attendance")) as AttendanceRecord[];
  return classId ? all.filter((r) => r.classId === classId) : all;
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  await localDb.kvPut("attendance", record);
}

export async function deleteAttendance(id: string): Promise<void> {
  await localDb.kvDelete("attendance", id);
}

// ---------- Grades ----------
export async function getGrades(classId?: string): Promise<GradeEntry[]> {
  const all = (await localDb.kvGetAll("grades")) as GradeEntry[];
  return classId ? all.filter((g) => g.classId === classId) : all;
}

export async function saveGrade(entry: GradeEntry): Promise<void> {
  await localDb.kvPut("grades", entry);
}

export async function deleteGrade(id: string): Promise<void> {
  await localDb.kvDelete("grades", id);
}

// ---------- Homework ----------
export async function getHomework(classId?: string): Promise<HomeworkItem[]> {
  const all = (await localDb.kvGetAll("homework")) as HomeworkItem[];
  return classId ? all.filter((h) => h.classId === classId) : all;
}

export async function saveHomework(item: HomeworkItem): Promise<void> {
  await localDb.kvPut("homework", item);
}

export async function deleteHomework(id: string): Promise<void> {
  await localDb.kvDelete("homework", id);
}

// ---------- Question Bank ----------
export async function getQuestionBank(): Promise<QuestionBankItem[]> {
  const all = (await localDb.kvGetAll("questionBank")) as QuestionBankItem[];
  return all.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

export async function saveBankItem(item: QuestionBankItem): Promise<void> {
  await localDb.kvPut("questionBank", item);
}

export async function deleteBankItem(id: string): Promise<void> {
  await localDb.kvDelete("questionBank", id);
}

// ---------- Semester Plans ----------
export async function getPlans(): Promise<SemesterPlan[]> {
  const all = (await localDb.kvGetAll("plans")) as SemesterPlan[];
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function savePlan(plan: SemesterPlan): Promise<void> {
  await localDb.kvPut("plans", plan);
}

export async function deletePlan(id: string): Promise<void> {
  await localDb.kvDelete("plans", id);
}