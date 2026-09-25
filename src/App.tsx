import React, { useState, useEffect, useRef } from "react";
import { Book, Lesson, TabId, TabContentRecord } from "./types";
import { TABS_CONFIG } from "./data/tabs";
import { localDb } from "./services/db";
import { LessonSidebar } from "./components/LessonSidebar";
import { LessonViewer } from "./components/LessonViewer";
import { BookUploadModal } from "./components/BookUploadModal";
import { MobileTabBar, MobileNavTab } from "./components/mobile/MobileTabBar";
import { TrackingCenter } from "./components/mobile/TrackingCenter";
import { MobileTopBar } from "./components/mobile/MobileTopBar";
import { MobileToolsSheet } from "./components/mobile/MobileToolsSheet";
import { MobileDatabaseModal } from "./components/mobile/MobileDatabaseModal";
import { MobileOurAppsSheet } from "./components/mobile/MobileOurAppsSheet";
import { DeleteBookModal } from "./components/DeleteBookModal";
import { LessonViewerHandle } from "./components/LessonViewer";
import { initAds, maybeShowInterstitial, showRewardedAd, isNativeApp as adsNative } from "./utils/ads";
import {
  BookOpen,
  PlusCircle,
  Loader2,
  Sparkles,
  Smartphone,
  Layers,
  Database,
} from "lucide-react";

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [activeAIModuleId, setActiveAIModuleId] = useState<TabId>("summary");

  // Modals & Navigation state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isAppsSheetOpen, setIsAppsSheetOpen] = useState(false);
  const [mobileActiveNav, setMobileActiveNav] = useState<MobileNavTab>("prepare");
  const [isDesktopFrame, setIsDesktopFrame] = useState(true); // Smartphone canvas frame on desktop
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [generatingAllTabs, setGeneratingAllTabs] = useState(false);

  // Ads + batch generation refs
  const lessonViewerRef = useRef<LessonViewerHandle>(null);

  // Book Deletion State
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [bookToDeleteLessonsCount, setBookToDeleteLessonsCount] = useState<number>(0);

  // Initialize DB and Seed data
  useEffect(() => {
    async function loadData() {
      try {
        await localDb.init();
        await localDb.seedIfEmpty();

        const storedBooks = await localDb.getBooks();
        setBooks(storedBooks);

        if (storedBooks.length > 0) {
          const firstBook = storedBooks[0];
          setCurrentBook(firstBook);

          const bookLessons = await localDb.getLessons(firstBook.id);
          setLessons(bookLessons);
          if (bookLessons.length > 0) {
            setSelectedLessonId(bookLessons[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setIsLoadingDB(false);
      }
    }

    loadData();
    initAds(); // Native only — no-ops on web. Kicks off MobileAds + app-open load.
  }, []);

  // When currentBook changes, reload its lessons
  const handleSelectBook = async (book: Book) => {
    setCurrentBook(book);
    const bookLessons = await localDb.getLessons(book.id);
    setLessons(bookLessons);
    if (bookLessons.length > 0) {
      setSelectedLessonId(bookLessons[0].id);
      setMobileActiveNav("prepare");
    } else {
      setSelectedLessonId(null);
    }
  };

  // When a new book is created via AI
  const handleBookCreated = async (newBook: Book, newLessons: Lesson[]) => {
    await localDb.saveBook(newBook);
    await localDb.saveLessons(newLessons);

    const updatedBooks = await localDb.getBooks();
    setBooks(updatedBooks);
    setCurrentBook(newBook);
    setLessons(newLessons);
    if (newLessons.length > 0) {
      setSelectedLessonId(newLessons[0].id);
      setMobileActiveNav("prepare");
    }
  };

  // Add manual lesson to current book
  const handleAddManualLesson = async (unitTitle: string) => {
    if (!currentBook) return;
    const title = prompt("أدخل عنوان الدرس الجديد:");
    if (!title) return;

    const newLessonId = `lesson-${Date.now()}`;
    const newLesson: Lesson = {
      id: newLessonId,
      bookId: currentBook.id,
      unitTitle,
      title,
      summary: "درس مضاف يدوياً.",
      estimatedDuration: "45 دقيقة",
      keyKeywords: ["مفهوم"],
      content: `محتوى الدرس: ${title}`,
      order: lessons.length + 1,
      generatedTabs: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await localDb.saveLesson(newLesson);
    const updated = await localDb.getLessons(currentBook.id);
    setLessons(updated);
    setSelectedLessonId(newLessonId);
    setMobileActiveNav("prepare");
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!currentBook) return;
    await localDb.deleteLesson(lessonId);
    const updated = await localDb.getLessons(currentBook.id);
    setLessons(updated);
    if (selectedLessonId === lessonId) {
      setSelectedLessonId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Open book deletion modal with exact lesson count
  const handleOpenDeleteBookModal = async (book: Book) => {
    setBookToDelete(book);
    if (currentBook?.id === book.id) {
      setBookToDeleteLessonsCount(lessons.length);
    } else {
      const bookLessons = await localDb.getLessons(book.id);
      setBookToDeleteLessonsCount(bookLessons.length);
    }
  };

  // Delete book entirely with all lessons and generated tabs
  const handleDeleteBook = async (bookId: string) => {
    await localDb.deleteBook(bookId);
    const updatedBooks = await localDb.getBooks();
    setBooks(updatedBooks);

    if (currentBook?.id === bookId) {
      if (updatedBooks.length > 0) {
        const nextBook = updatedBooks[0];
        setCurrentBook(nextBook);
        const nextLessons = await localDb.getLessons(nextBook.id);
        setLessons(nextLessons);
        setSelectedLessonId(nextLessons.length > 0 ? nextLessons[0].id : null);
      } else {
        setCurrentBook(null);
        setLessons([]);
        setSelectedLessonId(null);
      }
    }
    setBookToDelete(null);
  };

  // Save tab content (updates IndexedDB and local state)
  const handleSaveTabContent = async (
    tabId: TabId,
    record: TabContentRecord
  ) => {
    if (!selectedLessonId) return;

    const updatedLesson = await localDb.updateLessonTab(
      selectedLessonId,
      tabId,
      record
    );

    if (updatedLesson) {
      setLessons((prev) =>
        prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l))
      );
    }
  };

  // Update raw lesson content
  const handleUpdateLessonContent = async (newContent: string) => {
    if (!selectedLessonId) return;
    const currentLesson = lessons.find((l) => l.id === selectedLessonId);
    if (!currentLesson) return;

    const updated = {
      ...currentLesson,
      content: newContent,
      updatedAt: new Date().toISOString(),
    };

    await localDb.saveLesson(updated);
    setLessons((prev) =>
      prev.map((l) => (l.id === selectedLessonId ? updated : l))
    );
  };

  // Export entire DB backup
  const handleExportDB = async () => {
    const jsonStr = await localDb.exportAll();
    const baseFilename = `Mahdar_AlDurus_Backup_${new Date().toISOString().slice(0, 10)}.json`;

    const { isNativeApp, exportBackupToDrive } = await import("./services/mobileFiles");
    if (isNativeApp()) {
      try {
        const how = await exportBackupToDrive(jsonStr, baseFilename);
        alert(
          how === "drive"
            ? "تم فتح نافذة الحفظ في النظام. اختر موقع الحفظ في Google Drive (أو على جهازك) وستُحفظ النسخة الاحتياطية هناك مباشرةً."
            : "تم حفظ النسخة الاحتياطية في مجلد مستندات التطبيق على جهازك. اختر Google Drive من نافذة المشاركة لرفعها لحسابك."
        );
        maybeShowInterstitial();
      } catch (err) {
        console.error("Failed to save backup:", err);
        alert("تعذر حفظ النسخة الاحتياطية. تحقق من صلاحيات التخزين أو أعد المحاولة.");
      }
      return;
    }

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = baseFilename;
    a.click();
    URL.revokeObjectURL(url);
    maybeShowInterstitial();
  };

  // "Generate all missing tools" gated behind a rewarded ad (native) or given freely (web).
  const handleGenerateAllMissing = async () => {
    if (generatingAllTabs) return;

    if (adsNative()) {
      const { rewarded } = await showRewardedAd();
      if (!rewarded) {
        alert(
          "لم يتم منح التوليد الشامل: يجب مشاهدة إعلان المكافأة حتى نهايته للحصول على توليد كل الأدوات المتبقية."
        );
        return;
      }
    }

    setGeneratingAllTabs(true);
    try {
      const res = await lessonViewerRef.current?.generateAllMissing();
      const generated = res?.generated ?? 0;
      const failed = res?.failed ?? 0;
      const total = res?.total ?? 0;
      if (total === 0) {
        alert("لا توجد أدوات متبقية في هذا الدرس — كل الأدوات جاهزة بالفعل.");
      } else if (failed > 0) {
        alert(
          `اكتمل التوليد الشامل: نجح ${generated} من ${total}، وفشل ${failed} (تحقق من الاتصال وأعد المحاولة للأدوات الناقصة).`
        );
      } else {
        alert(`تم توليد ${generated} من ${total} أدوات بنجاح عبر الذكاء الاصطناعي.`);
      }
    } catch (err) {
      console.error("Batch generate failed:", err);
      alert("حدث خطأ أثناء التوليد الشامل. حاول مرة أخرى.");
    } finally {
      setGeneratingAllTabs(false);
    }
  };

  // Import DB backup
  const handleImportDB = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        const success = await localDb.importAll(content);
        if (success) {
          const storedBooks = await localDb.getBooks();
          setBooks(storedBooks);
          if (storedBooks.length > 0) {
            handleSelectBook(storedBooks[0]);
          }
          alert("تم استيراد قاعدة البيانات المحلية بنجاح!");
        } else {
          alert("فشل استيراد الملف. تأكد من صحة الملف المدخل.");
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset database to default demo
  const handleResetToSeed = async () => {
    try {
      localStorage.clear();
      // Re-seed with force flag
      await localDb.seedIfEmpty(true);
      const storedBooks = await localDb.getBooks();
      setBooks(storedBooks);
      if (storedBooks.length > 0) {
        handleSelectBook(storedBooks[0]);
      }
      alert("تمت إعادة ضبط قاعدة البيانات إلى النموذج الافتراضي.");
    } catch (e) {
      console.error(e);
    }
  };

  // Prev / Next lesson helper
  const currentLessonIndex = lessons.findIndex((l) => l.id === selectedLessonId);
  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1;

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      setSelectedLessonId(lessons[currentLessonIndex - 1].id);
    }
  };

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setSelectedLessonId(lessons[currentLessonIndex + 1].id);
    }
  };

  const handleSelectLessonAndOpenPrepare = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setMobileActiveNav("prepare");
  };

  // Handle bottom tab clicks
  const handleNavTabChange = (tab: MobileNavTab) => {
    if (tab === "tools") {
      setIsToolsSheetOpen(true);
      return;
    }
    if (tab === "database") {
      setIsDatabaseModalOpen(true);
      return;
    }
    setMobileActiveNav(tab);
  };

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  if (isLoadingDB) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/20">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div className="text-center">
          <div className="font-black text-base">محضر الدروس الذكي</div>
          <div className="text-xs text-slate-400 mt-1">
            جارٍ تجهيز بيئة العمل وقاعدة البيانات المحلية...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center sm:p-2 md:p-4 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Mobile-First Device Wrapper */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col bg-white overflow-hidden ${
          isDesktopFrame
            ? "max-w-md md:max-w-[460px] h-screen sm:h-[94vh] sm:rounded-[40px] shadow-2xl sm:ring-8 sm:ring-slate-800/80 sm:border sm:border-slate-700/50"
            : "max-w-7xl h-screen sm:rounded-2xl shadow-xl"
        }`}
      >
        {/* Mobile Top Bar */}
        <MobileTopBar
          books={books}
          currentBook={currentBook}
          onSelectBook={handleSelectBook}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          isDesktopFrame={isDesktopFrame}
          onToggleDesktopFrame={() => setIsDesktopFrame(!isDesktopFrame)}
          onOpenDatabase={() => setIsDatabaseModalOpen(true)}
          onOpenApps={() => setIsAppsSheetOpen(true)}
          onDeleteBookRequest={handleOpenDeleteBookModal}
        />

        {/* Dynamic Mobile Screen Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 1. LESSONS TAB VIEW (When mobile tab is 'lessons') */}
          {mobileActiveNav === "lessons" && (
            <div className="flex-1 h-full overflow-y-auto animate-in fade-in duration-200">
              {currentBook ? (
                <LessonSidebar
                  book={currentBook}
                  lessons={lessons}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={handleSelectLessonAndOpenPrepare}
                  onAddLesson={handleAddManualLesson}
                  onDeleteLesson={handleDeleteLesson}
                  onDeleteBook={handleOpenDeleteBookModal}
                  isMobileView={true}
                  onCloseMobile={() => setMobileActiveNav("prepare")}
                />
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-700">لا يوجد مقرر محدد</p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    رفع أول كتاب أو PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. PREPARATION & WORKSPACE VIEW (When mobile tab is 'prepare') */}
          {mobileActiveNav === "prepare" && (
            <div className="flex-1 h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
              {currentBook && selectedLesson ? (
                <LessonViewer
                  key={selectedLesson.id}
                  ref={lessonViewerRef}
                  lesson={selectedLesson}
                  book={currentBook}
                  onSaveTabContent={handleSaveTabContent}
                  onUpdateLessonContent={handleUpdateLessonContent}
                  activeTabId={activeAIModuleId}
                  onSelectTabId={(id) => setActiveAIModuleId(id)}
                  onOpenToolsSheet={() => setIsToolsSheetOpen(true)}
                  onNextLesson={handleNextLesson}
                  onPrevLesson={handlePrevLesson}
                  hasPrevLesson={hasPrevLesson}
                  hasNextLesson={hasNextLesson}
                  lessonIndex={currentLessonIndex}
                  totalLessons={lessons.length}
                  onOpenLessonsDrawer={() => setMobileActiveNav("lessons")}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg">
                    ابدأ برفع أول كتاب أو مقرر دراسي
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                    ارفع فهرس أو ملف PDF لكتابك المدرسي لتقسيمه تلقائياً إلى وحدات ودروس
                    وحفظها محلياً، مع {TABS_CONFIG.length} أدوات ذكاء اصطناعي لتحضير الدرس بالكامل.
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-5 flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>رفع وتقسيم كتاب جديد بالذكاء الاصطناعي</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. TRACKING, PLANS & QUESTION BANK VIEW */}
          {mobileActiveNav === "tracking" && (
            <TrackingCenter
              books={books}
              lessons={lessons}
              onClose={() => setMobileActiveNav("prepare")}
            />
          )}
        </div>

        {/* Bottom Mobile Tab Bar */}
        <MobileTabBar
          activeNav={mobileActiveNav}
          onSelectNav={handleNavTabChange}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          lessonsCount={lessons.length}
          currentLessonTitle={selectedLesson?.title}
          hasGeneratedTabsCount={
            selectedLesson?.generatedTabs
              ? Object.keys(selectedLesson.generatedTabs).length
              : 0
          }
        />

        {/* 10 AI Tools Bottom Sheet */}
        <MobileToolsSheet
          isOpen={isToolsSheetOpen}
          onClose={() => setIsToolsSheetOpen(false)}
          activeTabId={activeAIModuleId}
          onSelectTab={(tabId) => {
            setActiveAIModuleId(tabId);
            setMobileActiveNav("prepare");
          }}
          currentLesson={selectedLesson}
          onGenerateAllMissing={handleGenerateAllMissing}
          generatingAll={generatingAllTabs}
        />

        {/* Local Database Modal & Backup */}
        <MobileDatabaseModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          books={books}
          lessons={lessons}
          onExportDB={handleExportDB}
          onImportDB={handleImportDB}
          onResetToSeed={handleResetToSeed}
          onDeleteBookRequest={handleOpenDeleteBookModal}
        />

        {/* Our Apps Sheet */}
        <MobileOurAppsSheet
          isOpen={isAppsSheetOpen}
          onClose={() => setIsAppsSheetOpen(false)}
        />

        {/* Book Upload & AI Splitting Modal */}
        <BookUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onBookCreated={handleBookCreated}
        />

        {/* Delete Book Confirmation Modal */}
        <DeleteBookModal
          isOpen={!!bookToDelete}
          book={bookToDelete}
          lessonsCount={bookToDeleteLessonsCount}
          onClose={() => setBookToDelete(null)}
          onConfirmDelete={handleDeleteBook}
        />
      </div>
    </div>
  );
}
