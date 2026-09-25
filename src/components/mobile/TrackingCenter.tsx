import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Users,
  GraduationCap,
  BookOpenCheck,
  Library,
  Plus,
  Trash2,
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  MinusCircle,
  ClipboardCopy,
  FileText,
} from "lucide-react";
import { Book, Lesson, AttendanceStatus, AttendanceRecord } from "../../types";
import { generateSemesterPlanWithAI } from "../../services/ai";
import {
  getClasses,
  saveClass,
  deleteClass,
  getStudents,
  saveStudent,
  deleteStudent,
  getAttendance,
  saveAttendance,
  deleteAttendance,
  getGrades,
  saveGrade,
  deleteGrade,
  getHomework,
  saveHomework,
  deleteHomework,
  getQuestionBank,
  saveBankItem,
  deleteBankItem,
  getPlans,
  savePlan,
  deletePlan,
} from "../../services/teacherData";

type Section = "plan" | "attend" | "grades" | "homework" | "bank";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  books: Book[];
  lessons: Lesson[];
  onClose: () => void;
}

export const TrackingCenter: React.FC<Props> = ({ books, lessons, onClose }) => {
  const [section, setSection] = useState<Section>("plan");

  // ---- persisted data ----
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const refresh = useCallback(async () => {
    setClasses(await getClasses());
    setStudents(await getStudents());
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50/50 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-900 text-base leading-tight">المتابعة والخطط</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">إدارة الفصول والحضور والدرجات والواجبات والخطط — كلها محفوظة محلياً</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="bg-white border-b border-slate-200 px-3 pt-2 flex gap-1.5 overflow-x-auto">
        {(
          [
            ["plan", "الخطة الفصلية", CalendarDays],
            ["attend", "الحضور", Users],
            ["grades", "الدرجات", GraduationCap],
            ["homework", "الواجبات", BookOpenCheck],
            ["bank", "بنك الأسئلة", Library],
          ] as [Section, string, any][]
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-colors whitespace-nowrap ${
              section === id
                ? "bg-emerald-600/10 text-emerald-800 border-b-2 border-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {section === "plan" && <PlanSection books={books} lessons={lessons} onDataChange={refresh} />}
        {section === "attend" && (
          <AttendSection
            classes={classes}
            setClasses={setClasses}
            students={students}
            setStudents={setStudents}
            lessons={lessons}
          />
        )}
        {section === "grades" && <GradesSection classes={classes} setClasses={setClasses} students={students} />}
        {section === "homework" && (
          <HomeworkSection classes={classes} setClasses={setClasses} students={students} lessons={lessons} />
        )}
        {section === "bank" && <BankSection lessons={lessons} />}
      </div>
    </div>
  );
};

/* ================= PLAN SECTION ================= */
function PlanSection({ books, lessons, onDataChange }: { books: Book[]; lessons: Lesson[]; onDataChange: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [bookId, setBookId] = useState("");
  const [weeksCount, setWeeksCount] = useState(12);
  const [termLabel, setTermLabel] = useState("الفصل الدراسي الأول");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPlans().then(setPlans);
    if (books.length && !bookId) setBookId(books[0].id);
  }, [books.length]);

  const currentBook = books.find((b) => b.id === bookId);
  const bookLessons = lessons.filter((l) => l.bookId === bookId);

  const handleGenerate = async () => {
    if (!currentBook || !bookLessons || !bookLessons.length) {
      setError("المقرر لا يحتوي على دروس. أعد رفع المقرر أولاً.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await generateSemesterPlanWithAI({
        bookTitle: currentBook.title,
        subject: currentBook.subject,
        grade: currentBook.grade,
        weeksCount,
        termLabel,
        lessons: bookLessons.map((l) => ({
          title: l.title,
          unitTitle: l.unitTitle,
          summary: l.summary,
          duration: l.estimatedDuration,
        })),
      });
      if (!res.success) throw new Error(res.error || "فشل توليد الخطة");
      const plan = {
        id: uid(),
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        planTitle: res.plan?.planTitle || "الخطة الفصلية",
        termLabel,
        weeksCount,
        weeks: res.plan?.weeks || [],
        createdAt: new Date().toISOString(),
      };
      await savePlan(plan);
      setPlans(await getPlans());
      onDataChange();
    } catch (e: any) {
      setError(e?.message || "تعذر توليد الخطة. تأكد من الاتصال ثم أعد المحاولة.");
    } finally {
      setGenerating(false);
    }
  };

  const filteredPlans = plans.filter((p) => p.bookId === bookId);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600" />
          <h3 className="font-black text-slate-900 text-sm">الخطة الفصلية للعام الدراسي</h3>
        </div>
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">عدد الأسابيع</label>
            <input
              type="number"
              min={4}
              max={30}
              value={weeksCount}
              onChange={(e) => setWeeksCount(parseInt(e.target.value) || 12)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">الفصل</label>
            <input
              type="text"
              value={termLabel}
              onChange={(e) => setTermLabel(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !lessons}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-[0.98]"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{generating ? "جارٍ بناء الخطة وتوزيع الدروس..." : "توليد الخطة الفصلية بالذكاء الاصطناعي"}</span>
        </button>
        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
        {bookLessons?.length ? (
          <p className="text-[11px] text-slate-500">
            {bookLessons.length} درساً سيتم توزيعها على {weeksCount} أسبوعاً (مع أسابيع مراجعة وامتحانات).
          </p>
        ) : (
          <p className="text-[11px] text-amber-600 font-bold">
            يرجى رفع المقرر وتقسيمه إلى دروس أولاً (من «رفع كتاب»).
          </p>
        )}
      </div>

      {filteredPlans.map((plan) => (
        <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-slate-100">
            <div>
              <h4 className="font-black text-slate-900 text-sm">{plan.planTitle}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {plan.termLabel} — {plan.weeks?.length || 0} أسابيع — أُنشئت {new Date(plan.createdAt).toLocaleDateString("ar")}
              </p>
            </div>
            <button
              onClick={async () => {
                if (confirm("حذف هذه الخطة؟")) {
                  await deletePlan(plan.id);
                  setPlans(await getPlans());
                }
              }}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
              aria-label="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
            {plan.weeks?.map((w: any) => (
              <div key={w.week} className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black">
                    {w.week}
                  </span>
                  <span className="text-xs font-black text-slate-800">{w.title}</span>
                </div>
                <div className="text-[11px] text-slate-700 space-y-0.5 mt-1">
                  <div><b className="text-emerald-700">دروس : </b>{w.lessons?.join("، ")}</div>
                  <div><b className="text-sky-700">أهداف : </b>{w.objectives?.join(" • ")}</div>
                  <div><b className="text-amber-700">أنشطة : </b>{w.activities?.join(" • ")}</div>
                  <div><b className="text-violet-700">واجبات : </b>{w.homework?.join(" • ")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= CLASS / STUDENT HELPERS ================= */
function ClassPicker({
  classes,
  setClasses,
}: {
  classes: any[];
  setClasses: (c: any[]) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الفصل (مثال: 1/1 متوسط)"
          className="flex-1 min-w-0 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={async () => {
            if (!name.trim()) return;
            await saveClass({ id: uid(), name: name.trim(), createdAt: new Date().toISOString() });
            setName("");
            setClasses(await getClasses());
          }}
          className="p-2.5 rounded-xl bg-emerald-600 text-white"
          aria-label="إضافة فصل"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StudentManager({
  classId,
  students,
  setStudents,
}: {
  classId: string;
  students: any[];
  setStudents: (s: any[]) => void;
}) {
  const [name, setName] = useState("");
  const classStudents = students.filter((s) => s.classId === classId);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
      <h4 className="text-xs font-black text-slate-800">الطلاب ({classStudents.length})</h4>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الطالب/ة"
          className="flex-1 min-w-0 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={async () => {
            if (!name.trim()) return;
            await saveStudent({ id: uid(), classId, name: name.trim(), createdAt: new Date().toISOString() });
            setName("");
            setStudents(await getStudents());
          }}
          className="p-2.5 rounded-xl bg-teal-600 text-white"
          aria-label="إضافة طالب"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {classStudents.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700"
          >
            {s.name}
            <button
              onClick={async () => {
                if (confirm(`حذف الطالب «${s.name}»؟`)) {
                  await deleteStudent(s.id);
                  setStudents(await getStudents());
                }
              }}
              className="text-rose-400 hover:text-rose-600"
              aria-label="حذف"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!classStudents.length && <span className="text-[11px] text-slate-400">لا يوجد طلاب بعد — أضف الطلاب أعلاه.</span>}
      </div>
    </div>
  );
}

/* ================= ATTENDANCE SECTION ================= */
function AttendSection({
  classes,
  setClasses,
  students,
  setStudents,
  lessons,
}: {
  classes: any[];
  setClasses: (c: any[]) => void;
  students: any[];
  setStudents: (s: any[]) => void;
  lessons: Lesson[];
}) {
  const [classId, setClassId] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [entry, setEntry] = useState<Record<string, "present" | "absent" | "late">>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (classes.length && !classId) setClassId(classes[0].id);
  }, [classes.length]);

  useEffect(() => {
    if (classId) getAttendance(classId).then((r) => setRecords(r.sort((a: any, b: any) => (a.date < b.date ? 1 : -1))));
  }, [classId]);

  useEffect(() => {
    if (lessons.length && !lessonTitle) setLessonTitle(lessons[0].title);
  }, [lessons.length]);

  const classStudents = students.filter((s) => s.classId === classId);
  const recordKey = classId ? `${classId}__${lessonTitle}__${date}` : "";
  const currentRecord = records.find((r) => r.id === recordKey);

  useEffect(() => {
    if (currentRecord) {
      setEntry(currentRecord.records || {});
      setSaved(true);
    } else if (classStudents.length) {
      const def: Record<string, AttendanceStatus> = {};
      classStudents.forEach((s) => (def[s.id] = "present"));
      setEntry(def);
      setSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey, classStudents.length]);

  const cycle = (studentId: string) => {
    const order: AttendanceStatus[] = ["present", "absent", "late"];
    const now = entry[studentId] || "present";
    const next = order[(order.indexOf(now) + 1) % order.length];
    setEntry((p) => {
      const n = { ...p };
      n[studentId] = next;
      return n;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!classId || !lessonTitle) return;
    const record = {
      id: recordKey,
      classId,
      lessonTitle,
      sessionLabel: `${lessonTitle} — ${date}`,
      date,
      records: entry,
    };
    await saveAttendance(record);
    setRecords(await getAttendance(classId));
    setSaved(true);
  };

  return (
    <div className="space-y-3">
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {!classes.length && <option value="">— أنشئ فصلاً أولاً —</option>}
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ClassPicker classes={classes} setClasses={setClasses} />
      {classId && <StudentManager classId={classId} students={students} setStudents={setStudents} />}

      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black text-slate-800">تسجيل حضور الحصة</h4>
        </div>
        <select
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.title}>
              {l.title}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {classStudents.length ? (
          <div className="space-y-1.5">
            {classStudents.map((s) => {
              const st = entry[s.id] || "present";
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">{s.name}</span>
                  <div className="flex gap-1">
                    {(
                      [
                        ["present", "حاضر", "bg-emerald-500", CheckCircle2],
                        ["absent", "غائب", "bg-rose-500", Circle],
                        ["late", "متأخر", "bg-amber-500", MinusCircle],
                      ] as any[]
                    ).map(([id, label, cls, Icon]) => (
                      <button
                        key={id}
                        onClick={() => cycle(s.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          st === id ? `${cls} text-white` : "bg-white border border-slate-200 text-slate-400"
                        }`}
                      >
                        <Icon className="w-3 h-3 {''}" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">أضف طلاب الفصل لتسجيل حضورهم.</p>
        )}

        <button
          onClick={handleSave}
          className={`w-full p-3 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98] ${
            saved ? "bg-teal-600" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {saved ? "تم الحفظ — تحديث السجل الحالي" : "حفظ سجل الحضور"}
        </button>
      </div>

      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
          <h4 className="text-xs font-black text-slate-800">سجلات الحضور المحفوظة ({records.length})</h4>
          {records.map((r) => {
            const vals = Object.values(r.records || {}) as string[];
            const present = vals.filter((v) => v === "present").length;
            const absent = vals.filter((v) => v === "absent").length;
            const late = vals.filter((v) => v === "late").length;
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-700 min-w-0">
                  <div className="font-black text-slate-800 truncate">{r.sessionLabel}</div>
                  <div className="text-[10px] text-slate-500">
                    حاضر {present} · غائب {absent} · متأخر {late}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await deleteAttendance(r.id);
                    const recs = await getAttendance(classId);
                    setRecords(recs.sort((a: any, b: any) => (a.date < b.date ? 1 : -1)));
                  }}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= GRADES SECTION ================= */
function GradesSection({
  classes,
  setClasses,
  students,
}: {
  classes: any[];
  setClasses: (c: any[]) => void;
  students: any[];
}) {
  const [classId, setClassId] = useState("");
  const [grades, setGrades] = useState<any[]>([]);
  const [s, setS] = useState("");
  const [assessment, setAssessment] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("10");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (classes.length && !classId) setClassId(classes[0].id);
  }, [classes.length]);
  useEffect(() => {
    if (classId) getGrades(classId).then(setGrades);
  }, [classId]);

  const classStudents = students.filter((s2) => s2.classId === classId);
  const byStudent = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const g of grades) (map[g.studentId] = map[g.studentId] || []).push(g);
    return map;
  }, [grades]);

  const handleAdd = async () => {
    if (!s || !assessment || score === "") return;
    await saveGrade({
      id: uid(),
      classId,
      studentId: s,
      assessment,
      score: parseFloat(score) || 0,
      maxScore: parseFloat(maxScore) || 10,
      note,
      date: new Date().toISOString(),
    });
    setScore("");
    setNote("");
    setGrades(await getGrades(classId));
  };

  return (
    <div className="space-y-3">
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {!classes.length && <option value="">— أنشئ فصلاً أولاً —</option>}
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ClassPicker classes={classes} setClasses={setClasses} />

      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black text-slate-800">تسجيل درجة</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={s}
            onChange={(e) => setS(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— الطالب —</option>
            {classStudents.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <input
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="التقويم (اختبار / نشاط / واجب)"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="الدرجة"
            inputMode="decimal"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="من (الدرجة الكاملة)"
            inputMode="decimal"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={handleAdd}
          className="w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-[0.98]"
        >
          إضافة الدرجة
        </button>
      </div>

      {classStudents.map((st) => {
        const list = byStudent[st.id] || [];
        if (!list.length) return null;
        const total = list.reduce((a, g) => a + (g.score / (g.maxScore || 10)) * 100, 0);
        const avg = Math.round(total / list.length);
        return (
          <div key={st.id} className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">{st.name}</span>
              <span className={`text-[11px] font-black ${avg >= 50 ? "text-emerald-600" : "text-rose-600"}`}>
                المعدل: {avg}%
              </span>
            </div>
            {list.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                <div className="min-w-0">
                  <span className="font-bold text-slate-700">{g.assessment}</span>
                  <span className="text-slate-400"> — {new Date(g.date).toLocaleDateString("ar")}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-black text-slate-800">
                    {g.score}/{g.maxScore}
                  </span>
                  <button
                    onClick={async () => {
                      await deleteGrade(g.id);
                      setGrades(await getGrades(classId));
                    }}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ================= HOMEWORK SECTION ================= */
function HomeworkSection({
  classes,
  setClasses,
  students,
  lessons,
}: {
  classes: any[];
  setClasses: (c: any[]) => void;
  students: any[];
  lessons: Lesson[];
}) {
  const [classId, setClassId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (classes.length && !classId) setClassId(classes[0].id);
  }, [classes.length]);
  useEffect(() => {
    if (classId) getHomework(classId).then((h) => setItems(h.sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1))));
  }, [classId]);
  useEffect(() => {
    if (lessons.length && !lessonTitle) setLessonTitle(lessons[0].title);
  }, [lessons.length]);

  const classStudents = students.filter((s) => s.classId === classId);

  const handleAdd = async () => {
    if (!task.trim()) return;
    const item = {
      id: uid(),
      classId,
      lessonTitle,
      task: task.trim(),
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString(),
      submitted: [],
    };
    await saveHomework(item);
    setTask("");
    setItems(await getHomework(classId));
  };

  const toggle = async (itemId: string, studentId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const next: any = {
      ...item,
      submitted: item.submitted.includes(studentId)
        ? item.submitted.filter((x: string) => x !== studentId)
        : [...item.submitted, studentId],
    };
    await saveHomework(next);
    setItems(await getHomework(classId));
  };

  return (
    <div className="space-y-3">
      <select
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {!classes.length && <option value="">— أنشئ فصلاً أولاً —</option>}
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ClassPicker classes={classes} setClasses={setClasses} />

      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black text-slate-800">تكليف واجب منزلي</h4>
        </div>
        <select
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {lessons.map((l) => (
            <option key={l.id} value={l.title}>
              {l.title}
            </option>
          ))}
        </select>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="وصف الواجب المطلوب..."
          rows={2}
          className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 min-w-0 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleAdd}
            className="p-2.5 rounded-xl bg-emerald-600 text-white"
            aria-label="إضافة الواجب"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-800">{item.lessonTitle}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{item.task}</div>
              {item.dueDate && <div className="text-[10px] text-slate-400 mt-0.5">الاستحقاق: {item.dueDate}</div>}
            </div>
            <button
              onClick={async () => {
                await deleteHomework(item.id);
                setItems(await getHomework(classId));
              }}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {classStudents.map((st) => {
              const done = item.submitted.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => toggle(item.id, st.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= BANK SECTION ================= */
function BankSection({ lessons }: { lessons: Lesson[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composed, setComposed] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getQuestionBank().then(setItems);
  }, []);

  // Collect all quiz-record questions from the loaded book lessons
  const lessonQuizPool = useMemo(() => {
    const pool: any[] = [];
    for (const l of lessons) {
      const rec = l.generatedTabs?.quiz;
      const qs = rec?.data?.questions;
      if (Array.isArray(qs)) {
        for (const q of qs) pool.push({ ...q, lessonTitle: l.title });
      }
    }
    return pool;
  }, [lessons]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const compose = () => {
    const chosen = items.filter((i) => selected.has(i.id));
    const header = `ورقة اختبار تراكمي (بنك الأسئلة المحلي)\nالتاريخ: ${new Date().toLocaleDateString("ar")}\n==================================\n`;
    const parts: string[] = [];
    chosen.forEach((q, idx) => {
      if (q.type === "mcq") {
        parts.push(`${idx + 1}. ${q.question} (الدرس: ${q.lessonTitle})`);
        (q.options || []).forEach((o: string, oi: number) => parts.push(`   ${"أبجد"[oi] || oi + 1}. ${o}`));
      } else if (q.type === "true_false") {
        parts.push(`${idx + 1}. (صح / خطأ) ${q.question} (الدرس: ${q.lessonTitle})`);
      } else {
        parts.push(`${idx + 1}. ${q.question} (الدرس: ${q.lessonTitle})`);
      }
    });
    const answers = chosen
      .map((q, idx) => {
        if (q.type === "mcq") return `${idx + 1}. ${q.options?.[q.correctIndex] || q.correctIndex + 1}` + (q.explanation ? ` (${q.explanation})` : "");
        if (q.type === "true_false") return `${idx + 1}. ${q.correctBoolean ? "صح" : "خطأ"}` + (q.explanation ? ` (${q.explanation})` : "");
        return `${idx + 1}. ${q.modelAnswer || ""}`;
      })
      .join("\n");
    const body = `${header}${parts.join("\n")}\n\nالإجابة النموذجية:\n${answers}`;
    setComposed(body);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black text-slate-800">اختبار تركيبي من البنك ({items.length} سؤالاً محفوظاً)</h4>
        </div>
        <p className="text-[11px] text-slate-500">
          اختر الأسئلة المحفوظة (عند النقر على «إضافة إلى بنك الأسئلة» في تبويب أي درس) ثم ولّد ورقة اختبار جاهزة للطباعة أو النسخ.
        </p>
      </div>

      {items.map((q) => (
        <label
          key={q.id}
          className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-colors ${
            selected.has(q.id) ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-white"
          }`}
        >
          <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                q.type === "mcq" ? "bg-sky-100 text-sky-700" : q.type === "true_false" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
              }`}>
                {q.type === "mcq" ? "اختيار من متعدد" : q.type === "true_false" ? "صح وخطأ" : "مقالي"}
              </span>
              <span className="text-[10px] text-slate-400 truncate">{q.lessonTitle}</span>
            </div>
            <div className="text-xs font-bold text-slate-800">{q.question}</div>
            {q.options?.length ? (
              <div className="text-[11px] text-slate-500 mt-0.5">{q.options.join(" • ")}</div>
            ) : null}
          </div>
          <button
            onClick={async () => {
              await deleteBankItem(q.id);
              setItems(await getQuestionBank());
            }}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 shrink-0"
            aria-label="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </label>
      ))}
      {!items.length && (
        <p className="text-[11px] text-slate-400 bg-white rounded-2xl border border-slate-200 p-4">
          البنك فارغ. أضف أسئلة من أي درس عبر «إلى سؤال فوري → إضافة إلى بنك الأسئلة».
        </p>
      )}

      {lessonQuizPool.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-[11px] text-slate-500">
          ملاحظة: توجد {lessonQuizPool.length} سؤالاً في تبويب «الاختبار والأسئلة» للمقارنة/الدمج اليدوي في ورقة واحدة (يمكن نسخها من تبويب الاختبار).
        </div>
      )}

      <button
        onClick={compose}
        disabled={!selected.size}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition-all active:scale-[0.98]"
      >
        <FileText className="w-4 h-4" />
        توليد ورقة الاختبار المختارة ({selected.size})
      </button>

      {composed && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
            <span className="text-xs font-black text-slate-800">الورقة الجاهزة</span>
            <button
              onClick={copy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              {copied ? "تم النسخ" : "نسخ"}
            </button>
          </div>
          <pre dir="rtl" className="p-3 text-[12px] leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
            {composed}
          </pre>
        </div>
      )}
    </div>
  );
}