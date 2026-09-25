import React, { useState, useRef } from "react";
import { Book, Lesson } from "../types";
import { splitBookWithAI } from "../services/ai";
import {
  optimizeFileForUpload,
  slicePdfIntoChunks,
  mergeSequentialUnits,
} from "../utils/fileOptimizer";
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  BookOpen,
  Plus,
  Trash2,
  ArrowRight,
  Database,
  AlertCircle,
  FileCheck,
  Zap,
  Layers,
  Clock,
  StopCircle,
  ListOrdered,
} from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBookCreated: (book: Book, lessons: Lesson[]) => void;
}

const PRESET_SAMPLES = [
  {
    title: "تاريخ الحضارات الإنسانية والشرق القديم",
    subject: "الدراسات التاريخية",
    grade: "الصف الأول الثانوي",
    content: `الوحدة الأولى: حضارة بلاد الرافدين وحضارة مصر القديمة
الدرس الأول: الحضارة المصرية القديمة (عوامل قيامها والأسرات الحاكمة، ودور نهر النيل كشريان للحياة والزراعة وبناء الأهرامات).
الدرس الثاني: حضارة بلاد ما بين النهرين في العراق (السومريون، الأكاديون، والبابليون وشريعة حمورابي وتطور الكتابة المسمارية).
الوحدة الثانية: حضارات حوض البحر الأبيض المتوسط
الدرس الثالث: الحضارة الفينيقية والتجارة البحرية واختراع الأبجدية الأولى.
الدرس الرابع: الحضارة اليونانية والإغريقية (أثينا وإسبرطة، وظهور الفلسفة والعلوم والديمقراطية).`,
  },
  {
    title: "مبادئ الفيزياء الحديثة وقوانين الحركة",
    subject: "الفيزياء",
    grade: "الصف الثاني الإعدادي",
    content: `الوحدة الأولى: الميكانيكا وقوانين نيوتن
الدرس الأول: الحركة والسرعة والسرعة المتجهة والنسبية.
الدرس الثاني: قوانين نيوتن الثلاثة للحركة وتطبيقاتها في الحياة اليومية ومقاومة الهواء والاحتكاك.
الوحدة الثانية: الموجات والضوء والصوت
الدرس الثالث: الحركة الموجية وخصائص الموجات الطولية والمستعرضة وسرعة انتشار الصوت.
الدرس الرابع: الضوء وخصائصه وانعكاسه وانكساره وتطبيقات العدسات والمرايا.`,
  },
  {
    title: "البلاغة العربية والأدب العربي الأصيل",
    subject: "اللغة العربية",
    grade: "المرحلة الثانوية",
    content: `الوحدة الأولى: علم البيان
الدرس الأول: التشبيه وأركانه وأقسامه (التشبيه المفرد والتمثيلي والضمني وسر جماله).
الدرس الثاني: الاستعارة التصريحية والمكنية والفرق بين التشبيه والاستعارة وأثرهما في المعنى.
الوحدة الثانية: علم البديع
الدرس الثالث: المحسنات اللفظية (الجناس، السجع، حسن التقسيم، والتصريع).
الدرس الرابع: المحسنات المعنوية (الطباق، المقابلة، التورية، ومراعاة النظير).`,
  },
];

export interface ChunkProgressItem {
  chunkIndex: number;
  startPage: number;
  endPage: number;
  status: "waiting" | "processing" | "completed" | "error";
  extractedUnitsCount: number;
  extractedLessonsCount: number;
  errorMsg?: string;
}

export const BookUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onBookCreated,
}) => {
  const [step, setStep] = useState<"input" | "review">("input");
  const [bookTitle, setBookTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // File Upload state (supports PDF, images, and text)
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [fileMimeType, setFileMimeType] = useState<string>("application/pdf");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [optimizationNote, setOptimizationNote] = useState<string>("");
  const [pageInfo, setPageInfo] = useState<string>("");

  // Sequential multi-part PDF analysis state
  const [rawUploadedFile, setRawUploadedFile] = useState<File | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
  const [pagesPerChunk, setPagesPerChunk] = useState<number>(20);
  const [isSequentialRunning, setIsSequentialRunning] = useState<boolean>(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [chunkProgressList, setChunkProgressList] = useState<ChunkProgressItem[]>([]);
  const abortSequentialRef = useRef<boolean>(false);

  // Extracted Units & Lessons for Review step
  const [extractedUnits, setExtractedUnits] = useState<
    {
      unitTitle: string;
      lessons: {
        title: string;
        summary: string;
        estimatedDuration: string;
        keyKeywords: string[];
        content: string;
      }[];
    }[]
  >([]);

  if (!isOpen) return null;

  const handleSelectSample = (sample: typeof PRESET_SAMPLES[0]) => {
    setBookTitle(sample.title);
    setSubject(sample.subject);
    setGrade(sample.grade);
    setContent(sample.content);
    setFileBase64(null);
    setFileName("");
    setFileSize("");
    setOptimizationNote("");
    setPageInfo("");
    setUploadMode("text");
    setErrorMessage("");
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (file.size > 70 * 1024 * 1024) {
      setErrorMessage(
        "حجم الملف كبير جداً (يتجاوز 70 ميجابايت). يُرجى اختيار ملف أصغر أو تصوير صفحات الفهرس فقط."
      );
      return;
    }

    setFileName(file.name);
    setErrorMessage("");
    setOptimizationNote("");
    setPageInfo("");
    setIsProcessingFile(true);
    setRawUploadedFile(file);

    // Auto-populate book title if not already entered
    if (!bookTitle.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ")
        .trim();
      if (cleanName) {
        setBookTitle(cleanName);
      }
    }

    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          const { totalPages } = await slicePdfIntoChunks(file, pagesPerChunk);
          setPdfTotalPages(totalPages);
        } catch (sliceErr) {
          console.warn("Could not pre-slice PDF:", sliceErr);
          setPdfTotalPages(0);
        }
      } else {
        setPdfTotalPages(0);
      }

      const result = await optimizeFileForUpload(file);

      if (result.textContent) {
        setContent(result.textContent);
        setFileBase64(null);
        setUploadMode("text");
        setFileSize(result.originalSizeFormatted);
      } else if (result.dataUrl) {
        setFileBase64(result.dataUrl);
        setFileMimeType(result.mimeType);
        setFileSize(result.optimizedSizeFormatted || result.originalSizeFormatted);
        setUploadMode("file");

        if (result.pageCount) {
          if (result.extractedPages && result.extractedPages < result.pageCount) {
            setPageInfo(`${result.extractedPages} من أصل ${result.pageCount} صفحة`);
          } else {
            setPageInfo(`${result.pageCount} صفحة`);
          }
        }

        if (result.optimizationNote) {
          setOptimizationNote(result.optimizationNote);
        }
      }
    } catch (err: any) {
      console.error("Error optimizing file:", err);
      setErrorMessage(
        err?.message || "تعذر قراءة أو تحسين الملف المرفق. يرجى التأكد من سلامة الملف والمحاولة مرة أخرى."
      );
      setFileBase64(null);
      setRawUploadedFile(null);
      setPdfTotalPages(0);
      setFileName("");
      setFileSize("");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFileBase64(null);
    setRawUploadedFile(null);
    setPdfTotalPages(0);
    setFileName("");
    setFileSize("");
    setOptimizationNote("");
    setPageInfo("");
    setIsSequentialRunning(false);
    setChunkProgressList([]);
  };

  const handleRunSequentialAI = async () => {
    if (!rawUploadedFile) {
      handleRunAI();
      return;
    }

    const effectiveTitle =
      bookTitle.trim() ||
      (fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim() : "") ||
      "المقرر الدراسي";

    if (!bookTitle.trim()) {
      setBookTitle(effectiveTitle);
    }

    setIsSequentialRunning(true);
    setIsLoading(true);
    setErrorMessage("");
    abortSequentialRef.current = false;

    try {
      // 1. Slice file into sequential chunks of pages
      const { totalPages, chunks } = await slicePdfIntoChunks(rawUploadedFile, pagesPerChunk);
      setPdfTotalPages(totalPages);

      if (!chunks || chunks.length === 0) {
        throw new Error("تعذر تجزئة صفحات الكتاب. يرجى التأكد من أن الملف سليم.");
      }

      const initialProgress: ChunkProgressItem[] = chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        startPage: c.startPage,
        endPage: c.endPage,
        status: "waiting",
        extractedUnitsCount: 0,
        extractedLessonsCount: 0,
      }));
      setChunkProgressList(initialProgress);

      let accumulatedUnits: {
        unitTitle: string;
        lessons: {
          title: string;
          summary: string;
          estimatedDuration: string;
          keyKeywords: string[];
          content: string;
        }[];
      }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (abortSequentialRef.current) {
          break;
        }

        const chunk = chunks[i];
        setCurrentChunkIndex(i);

        setChunkProgressList((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "processing" } : item
          )
        );

        try {
          const result = await splitBookWithAI({
            bookTitle: effectiveTitle,
            subject,
            grade,
            content: content.trim(),
            fileBase64: chunk.dataUrl,
            fileName: `${effectiveTitle} - جزء ${i + 1} (ص ${chunk.startPage}-${chunk.endPage}).pdf`,
            fileMimeType: "application/pdf",
            chunkIndex: i,
            totalChunks: chunks.length,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            previousUnitsContext: accumulatedUnits.map((u) => u.unitTitle),
          });

          if (result.units && result.units.length > 0) {
            const chunkUnits = result.units.map((u) => ({
              unitTitle: u.unitTitle || `وحدة دراسية (${chunk.startPage}-${chunk.endPage})`,
              lessons: (u.lessons || []).map((l) => ({
                title: l.title || "درس دراسي",
                summary: l.summary || "ملخص ومحاور الدرس.",
                estimatedDuration: l.estimatedDuration || "45 دقيقة",
                keyKeywords: l.keyKeywords || ["مفهوم رئيسي"],
                content:
                  l.content ||
                  `محتوى درس ${l.title} المستخرج من صفحات ${chunk.startPage} إلى ${chunk.endPage}`,
              })),
            }));

            accumulatedUnits = mergeSequentialUnits(accumulatedUnits, chunkUnits);
            setExtractedUnits([...accumulatedUnits]);

            const lessonsCount = chunkUnits.reduce(
              (acc, u) => acc + u.lessons.length,
              0
            );

            setChunkProgressList((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      status: "completed",
                      extractedUnitsCount: chunkUnits.length,
                      extractedLessonsCount: lessonsCount,
                    }
                  : item
              )
            );
          } else {
            setChunkProgressList((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      status: "completed",
                      extractedUnitsCount: 0,
                      extractedLessonsCount: 0,
                    }
                  : item
              )
            );
          }
        } catch (chunkErr: any) {
          console.error(`Error in chunk ${i + 1}:`, chunkErr);
          setChunkProgressList((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "error",
                    errorMsg: chunkErr?.message || "تعذر إكمال هذا الجزء",
                  }
                : item
            )
          );
        }

        // Brief delay between chunk calls for smooth rendering and rate safety
        await new Promise((r) => setTimeout(r, 450));
      }

      if (accumulatedUnits.length > 0) {
        setExtractedUnits(accumulatedUnits);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setStep("review");
      } else {
        throw new Error(
          "لم يتم استخراج وحدات دراسية من الكتاب. يرجى التأكد من وضوح الصفحات والمحاولة مرة أخرى."
        );
      }
    } catch (err: any) {
      console.error("Sequential execution error:", err);
      setErrorMessage(err?.message || "حدث خطأ أثناء التقسيم المتسلسل للكتاب.");
    } finally {
      setIsSequentialRunning(false);
      setIsLoading(false);
    }
  };

  const handleStopSequentialEarly = () => {
    abortSequentialRef.current = true;
    if (extractedUnits.length > 0) {
      setIsSequentialRunning(false);
      setIsLoading(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setStep("review");
    } else {
      setIsSequentialRunning(false);
      setIsLoading(false);
    }
  };

  const handleRunAI = async () => {
    const effectiveTitle =
      bookTitle.trim() ||
      (fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim() : "") ||
      "المقرر الدراسي";

    if (!fileBase64 && (!content.trim() || content.trim().length < 10)) {
      setErrorMessage(
        "يرجى رفع ملف كتاب أو صورة للفهرس أو كتابة محتوى الكتاب/الفهرس (10 أحرف كحد أدنى)."
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => (prev < 2 ? prev + 1 : prev));
    }, 2500);

    try {
      const result = await splitBookWithAI({
        bookTitle: effectiveTitle,
        subject,
        grade,
        content: content.trim(),
        fileBase64: fileBase64 || undefined,
        fileName: fileName || undefined,
        fileMimeType: fileMimeType,
      });

      if (!result.units || result.units.length === 0) {
        throw new Error(
          "لم يتمكن الذكاء الاصطناعي من استخراج الدروس. تأكد من وضوح محتوى الملف وحاول مجدداً."
        );
      }

      // If user hadn't set book title, apply effective title
      if (!bookTitle.trim()) {
        setBookTitle(effectiveTitle);
      }

      setExtractedUnits(
        result.units.map((u) => ({
          unitTitle: u.unitTitle || "وحدة دراسية",
          lessons: (u.lessons || []).map((l) => ({
            title: l.title || "درس دراسي",
            summary: l.summary || "ملخص ومحاور الدرس.",
            estimatedDuration: l.estimatedDuration || "45 دقيقة",
            keyKeywords: l.keyKeywords || ["مفهوم رئيسي"],
            content:
              l.content ||
              content.slice(0, 1000) ||
              `محتوى درس ${l.title} المستخرج من كتاب ${effectiveTitle}`,
          })),
        }))
      );

      setStep("review");
    } catch (err: any) {
      console.error("AI Split error:", err);
      setErrorMessage(
        err?.message ||
          "حدث خطأ أثناء تحليل وتقسيم الكتاب. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى."
      );
    } finally {
      clearInterval(stageInterval);
      setIsLoading(false);
    }
  };

  const handleSaveToLocalDB = () => {
    const bookId = `book-${Date.now()}`;
    const allLessons: Lesson[] = [];

    let orderCounter = 1;
    const unitsMap = extractedUnits.map((u) => {
      const lessonIds: string[] = [];
      u.lessons.forEach((l) => {
        const lessonId = `lesson-${Date.now()}-${orderCounter}`;
        lessonIds.push(lessonId);

        allLessons.push({
          id: lessonId,
          bookId,
          unitTitle: u.unitTitle,
          title: l.title,
          summary: l.summary,
          estimatedDuration: l.estimatedDuration || "45 دقيقة",
          keyKeywords: l.keyKeywords || [],
          content: l.content,
          order: orderCounter++,
          generatedTabs: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      return {
        unitTitle: u.unitTitle,
        lessonIds,
      };
    });

    const newBook: Book = {
      id: bookId,
      title: bookTitle,
      subject: subject || "عام",
      grade: grade || "المرحلة العامة",
      description: `تم تقسيم هذا الكتاب آلياً بواسطة الذكاء الاصطناعي إلى ${allLessons.length} دروس ضمن ${unitsMap.length} وحدات.`,
      coverTheme: "emerald",
      createdAt: new Date().toISOString(),
      units: unitsMap,
    };

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    onBookCreated(newBook, allLessons);
    onClose();
  };

  const removeLesson = (unitIdx: number, lessonIdx: number) => {
    setExtractedUnits((prev) => {
      const updated = [...prev];
      updated[unitIdx].lessons.splice(lessonIdx, 1);
      return updated;
    });
  };

  const addManualLesson = (unitIdx: number) => {
    const title = prompt("أدخل عنوان الدرس الجديد:");
    if (!title) return;

    setExtractedUnits((prev) => {
      const updated = [...prev];
      updated[unitIdx].lessons.push({
        title,
        summary: "درس مضاف حديثاً.",
        estimatedDuration: "45 دقيقة",
        keyKeywords: ["مفهوم"],
        content: `محتوى الدرس: ${title}`,
      });
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {step === "input"
                  ? "رفع كتاب أو مقرر وتقسيمه بالذكاء الاصطناعي"
                  : "مراجعة واعتماد تقسيم الوحدات والدروس"}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {step === "input"
                  ? "يدعم رفع ملفات الكتب بصيغة PDF أو الملفات النصية والفهارس لتقسيمها محلياً"
                  : "تأكد من عناوين الدروس قبل حفظها في قاعدة البيانات المحلية"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === "input" ? (
            isSequentialRunning ? (
              /* Sequential Multi-Part Live Progress Screen */
              <div className="space-y-4 py-1 animate-in fade-in">
                {/* Live Status Header */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>التقسيم والتحليل المتسلسل للكتاب كاملاً</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            تلقائي متتابع
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          الجزء {currentChunkIndex + 1} من {chunkProgressList.length} (الصفحات {chunkProgressList[currentChunkIndex]?.startPage || 1} إلى {chunkProgressList[currentChunkIndex]?.endPage || pagesPerChunk})
                        </p>
                      </div>
                    </div>

                    {/* Live Counters */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-2xs text-center">
                        <div className="text-[10px] text-slate-500 font-semibold">الوحدات المستخرجة</div>
                        <div className="text-sm font-black text-emerald-700">{extractedUnits.length}</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-2xs text-center">
                        <div className="text-[10px] text-slate-500 font-semibold">الدروس المستخرجة</div>
                        <div className="text-sm font-black text-emerald-700">
                          {extractedUnits.reduce((acc, u) => acc + u.lessons.length, 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>التقدم التراكمي لإنجاز الكتاب</span>
                      <span>
                        {Math.round(
                          ((currentChunkIndex + 1) / Math.max(1, chunkProgressList.length)) * 100
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.round(
                            ((currentChunkIndex + 1) / Math.max(1, chunkProgressList.length)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Parts Stepper List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>مسار أجزاء الكتاب ({chunkProgressList.length} أجزاء متتابعة):</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">
                      تحليل كل جزء وحفظ الدروس دون اقتطاع
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {chunkProgressList.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                          item.status === "processing"
                            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                            : item.status === "completed"
                            ? "bg-emerald-50/70 border-emerald-200"
                            : item.status === "error"
                            ? "bg-rose-50 border-rose-200"
                            : "bg-slate-50 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                              item.status === "processing"
                                ? "bg-blue-600 text-white animate-pulse"
                                : item.status === "completed"
                                ? "bg-emerald-600 text-white"
                                : item.status === "error"
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.chunkIndex + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              الجزء {item.chunkIndex + 1}: الصفحات ({item.startPage} - {item.endPage})
                            </div>
                            <div className="text-[11px] mt-0.5">
                              {item.status === "processing" && (
                                <span className="text-blue-700 font-semibold flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  جارٍ استخراج الوحدات والمفاهيم والدروس من هذا الجزء...
                                </span>
                              )}
                              {item.status === "completed" && (
                                <span className="text-emerald-800 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  تم بنجاح (استخرج {item.extractedUnitsCount} وحدات و {item.extractedLessonsCount} دروس)
                                </span>
                              )}
                              {item.status === "waiting" && (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  في قائمة الانتظار للمتابعة المتسلسلة...
                                </span>
                              )}
                              {item.status === "error" && (
                                <span className="text-rose-700 font-medium">
                                  {item.errorMsg || "تعذر إكمال هذا الجزء"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {item.status === "processing" && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                              نشط الآن
                            </span>
                          )}
                          {item.status === "completed" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              مكتمل ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stop Early / Finalize Callout */}
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] text-slate-600 font-medium">
                    💡 تلميح: يمكنك إيقاف المعالجة والاكتفاء بالأجزاء المكتملة في أي لحظة.
                  </div>
                  <div className="flex items-center gap-2">
                    {extractedUnits.length > 0 && (
                      <button
                        type="button"
                        onClick={handleStopSequentialEarly}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>إنهاء والاكتفاء بما تم استخراجه ({extractedUnits.length} وحدات)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStopSequentialEarly}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <>
              {/* Ready Samples Strip */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                <div className="text-[11px] font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>أو اختر نموذج منهج جاهز للتجربة الفورية السريعة:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-emerald-300/80 hover:bg-emerald-100/70 text-emerald-800 transition-colors shadow-2xs text-right"
                    >
                      {sample.title} ({sample.subject})
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    uploadMode === "file"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>رفع ملف (كتاب PDF أو صورة الفهرس)</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-100 text-rose-800 font-extrabold">
                    مستحسن
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("text")}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    uploadMode === "text"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>لصق نص أو فهرس يدوي (.txt / .md)</span>
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان الكتاب أو المقرر <span className="text-slate-400 font-normal">(يُستخرج تلقائياً من اسم الملف إن تُرك فارغاً)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: العلوم المتكاملة، تاريخ الحضارات، فيزياء الحركة..."
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المادة أو التخصص
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: العلوم، الأحياء، التاريخ..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المرحلة الدراسية / الصف
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: الصف الأول الثانوي، المرحلة الإعدادية..."
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Upload File Section */}
              {uploadMode === "file" ? (
                <div className="space-y-3">
                  {!fileBase64 ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                        isDragging
                          ? "border-emerald-500 bg-emerald-50/70 scale-[0.99]"
                          : "border-slate-300 hover:border-emerald-400 bg-slate-50/70"
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*,.png,.jpg,.jpeg,.webp,.txt,.md"
                        onChange={handleFileUpload}
                        disabled={isProcessingFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {isProcessingFile ? (
                        <div className="flex flex-col items-center justify-center space-y-2.5 py-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              جارٍ فحص وتحسين صفحات الملف...
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              يتم تجهيز وتقليص الفهرس تلقائياً لتسريع التحليل وتفادي بطء الخادم
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2.5">
                          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              اضغط لاختيار ملف الكتاب أو اسحبه وأفلته هنا
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              يدعم ملفات الكتب والمذكرات (PDF) وصور الفهارس (JPG/PNG) مباشرة بواسطة الذكاء الاصطناعي
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>PDF مع ضغط ذكي تلقائي</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>صور الفهارس والمقررات</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Selected File Card with options and action buttons */
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs font-black text-xs ${
                              fileMimeType.includes("pdf") ? "bg-rose-600" : "bg-blue-600"
                            }`}
                          >
                            {fileMimeType.includes("pdf") ? "PDF" : "ملف"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                {fileName}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold shrink-0">
                                {fileSize}
                              </span>
                              {(pdfTotalPages > 0 || pageInfo) && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-bold shrink-0 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  <span>{pdfTotalPages > 0 ? `${pdfTotalPages} صفحة` : pageInfo}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-emerald-800 font-medium mt-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم تجهيز الملف بنجاح وهو جاهز للتقسيم واستخراج الدروس</span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-lg font-bold transition-colors shrink-0 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>تغيير</span>
                        </button>
                      </div>

                      {/* Optimization Note */}
                      {optimizationNote && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300/80 text-[11px] text-emerald-900 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{optimizationNote}</span>
                        </div>
                      )}

                      {/* PDF Multi-part Sequential Analysis Card */}
                      {fileMimeType.includes("pdf") && pdfTotalPages > 15 ? (
                        <div className="p-3.5 bg-white rounded-xl border border-emerald-300/80 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                                <Layers className="w-4 h-4 text-emerald-700" />
                              </div>
                              <div>
                                <h5 className="text-xs font-extrabold text-slate-900">
                                  نظام التقسيم المتسلسل الشامل للكتاب ({Math.ceil(pdfTotalPages / pagesPerChunk)} أجزاء)
                                </h5>
                                <p className="text-[11px] text-slate-500">
                                  تجزئة الكتاب إلى أجزاء متعاقبة وتحليلها بالتتابع لتغطية الكتاب كاملاً دون اقتطاع
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              موصى به
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600">حجم الجزء الواحد:</span>
                            {[15, 20, 25].map((pages) => (
                              <button
                                key={pages}
                                type="button"
                                onClick={() => setPagesPerChunk(pages)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  pagesPerChunk === pages
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {pages} صفحة
                              </button>
                            ))}
                            <span className="text-[10px] text-slate-400 mr-auto">
                              (الإجمالي: {Math.ceil(pdfTotalPages / pagesPerChunk)} دفعات متتالية)
                            </span>
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRunSequentialAI}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>بدء التقسيم والتحليل المتسلسل للكتاب كاملاً ({Math.ceil(pdfTotalPages / pagesPerChunk)} أجزاء)</span>
                              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                            </button>

                            <button
                              type="button"
                              onClick={handleRunAI}
                              disabled={isLoading}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold transition-all"
                              title="يحلل الفهرس وأول 20 صفحة فقط بسرعة فائقة"
                            >
                              تحليل الفهرس السريع (أول 20 صفحة)
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Direct Start Analysis for small PDFs or images */
                        <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[11px] text-emerald-900 font-semibold">
                            💡 اضغط الزر للبدء مباشرة في استخراج الوحدات والدروس:
                          </div>
                          <button
                            type="button"
                            onClick={handleRunAI}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>جارٍ التحليل...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>تحليل الملف واستخراج الدروس الآن</span>
                                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Notes with File */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظات أو توجيهات إضافية للذكاء الاصطناعي (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="مثال: ركز على الوحدات الأولى فقط، أو قسّم كل فصل لدرسين بحد أقصى..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 font-sans"
                    />
                  </div>
                </div>
              ) : (
                /* Text or Markdown Input */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      محتوى الكتاب أو الفهرس أو الفصول <span className="text-rose-500">*</span>
                    </label>
                    <label className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>رفع ملف نصي (.txt / .md)</span>
                      <input
                        type="file"
                        accept=".txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="الصق هنا فهرس الكتاب، أو نصوص الفصول، أو عناوين الوحدات والدروس ليتولى الذكاء الاصطناعي تفكيكها وتنظيمها..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed font-mono"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span>عدد الأحرف: {content.length} حرف</span>
                    <span>يمكنك أيضاً التبديل إلى تبويب "رفع ملف" بالأعلى</span>
                  </div>
                </div>
              )}

              {/* Multi-step progress indicator when loading */}
              {isLoading && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>
                      {loadingStage === 0 && "1/3: قراءة وفحص صفحات ومحتوى الملف بواسطة الذكاء الاصطناعي..."}
                      {loadingStage === 1 && "2/3: استخراج الأبواب والوحدات والفصول وترتيب تسلسل الدروس..."}
                      {loadingStage >= 2 && "3/3: كتابة الأهداف والمفاهيم والملخصات العلمية لكل درس..."}
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-700"
                      style={{ width: `${(loadingStage + 1) * 33}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    قد تستغرق العملية بضع ثوانٍ حسب حجم الملف والمقرر، يرجى الانتظار...
                  </p>
                </div>
              )}
            </>
            )
          ) : (
            /* Review Extracted Units Step */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  الوحدات والدروس المستخرجة ({extractedUnits.reduce((acc, u) => acc + u.lessons.length, 0)} دروس)
                </span>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  العودة لتعديل النص
                </button>
              </div>

              <div className="space-y-4">
                {extractedUnits.map((u, uIdx) => (
                  <div
                    key={uIdx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{u.unitTitle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addManualLesson(uIdx)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة درس</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {u.lessons.map((lesson, lIdx) => (
                        <div
                          key={lIdx}
                          className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex-1">
                            <div className="font-bold text-slate-900">{lesson.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {lesson.summary}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLesson(uIdx, lIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            title="حذف هذا الدرس"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={isSequentialRunning ? handleStopSequentialEarly : onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {isSequentialRunning ? "إلغاء العملية" : "إلغاء"}
          </button>

          {isSequentialRunning ? (
            <div className="flex items-center gap-2">
              {extractedUnits.length > 0 && (
                <button
                  type="button"
                  onClick={handleStopSequentialEarly}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إنهاء ومراجعة ما تم استخراجه ({extractedUnits.length} وحدات)</span>
                </button>
              )}
            </div>
          ) : step === "input" ? (
            <button
              type="button"
              onClick={
                fileBase64 && fileMimeType.includes("pdf") && pdfTotalPages > 15
                  ? handleRunSequentialAI
                  : handleRunAI
              }
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {fileBase64
                      ? "جارٍ قراءة الملف واستخراج الدروس بالذكاء الاصطناعي..."
                      : "جارٍ تحليل وتقسيم الكتاب بالذكاء الاصطناعي..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {fileBase64 && fileMimeType.includes("pdf") && pdfTotalPages > 15
                      ? `بدء التقسيم المتسلسل الشامل (${Math.ceil(pdfTotalPages / pagesPerChunk)} أجزاء)`
                      : fileBase64
                      ? "تحليل الملف المرفق وتقسيمه إلى دروس"
                      : "تقسيم الكتاب إلى دروس بالذكاء الاصطناعي"}
                  </span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveToLocalDB}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Database className="w-4 h-4" />
              <span>حفظ في قاعدة البيانات المحلية والبدء</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
