import { Book, Lesson, TabId, TabContentRecord } from "../types";

const DB_NAME = "MahdarAlDurusDB";
const DB_VERSION = 2;

const KV_STORES = [
  "classes",
  "students",
  "attendance",
  "grades",
  "homework",
  "questionBank",
  "plans",
] as const;

function ensureStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains("books")) {
    db.createObjectStore("books", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("lessons")) {
    const lessonStore = db.createObjectStore("lessons", { keyPath: "id" });
    lessonStore.createIndex("bookId", "bookId", { unique: false });
  }
  for (const store of KV_STORES) {
    if (!db.objectStoreNames.contains(store)) {
      db.createObjectStore(store, { keyPath: "id" });
    }
  }
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private isReady = false;

  public async init(): Promise<boolean> {
    if (this.isReady && this.db) return true;

    return new Promise((resolve) => {
      try {
        if (typeof window === "undefined" || !window.indexedDB) {
          console.warn("IndexedDB not supported, falling back to localStorage.");
          this.isReady = true;
          resolve(false);
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          ensureStores(db);
        };

        request.onsuccess = (event: any) => {
          this.db = event.target.result;
          this.isReady = true;
          resolve(true);
        };

        request.onerror = (err) => {
          console.warn("IndexedDB open error, falling back to localStorage", err);
          this.isReady = true;
          resolve(false);
        };
      } catch (err) {
        console.warn("IndexedDB exception, falling back to localStorage", err);
        this.isReady = true;
        resolve(false);
      }
    });
  }

  // ---- Books Methods ----
  public async getBooks(): Promise<Book[]> {
    await this.init();

    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["books"], "readonly");
          const store = transaction.objectStore("books");
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
    }

    // LocalStorage Fallback
    try {
      const data = localStorage.getItem(`${DB_NAME}_books`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public async getBook(id: string): Promise<Book | null> {
    const books = await this.getBooks();
    return books.find((b) => b.id === id) || null;
  }

  public async saveBook(book: Book): Promise<void> {
    await this.init();

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["books"], "readwrite");
          const store = transaction.objectStore("books");
          const request = store.put(book);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
      return;
    }

    // LocalStorage Fallback
    try {
      const books = await this.getBooks();
      const idx = books.findIndex((b) => b.id === book.id);
      if (idx >= 0) books[idx] = book;
      else books.unshift(book);
      localStorage.setItem(`${DB_NAME}_books`, JSON.stringify(books));
    } catch (err) {
      console.error("Failed saving to localStorage", err);
    }
  }

  public async deleteBook(id: string): Promise<void> {
    await this.init();

    if (this.db) {
      // Delete book
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["books"], "readwrite");
          const store = transaction.objectStore("books");
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });

      // Delete its lessons
      const lessons = await this.getLessons(id);
      for (const lesson of lessons) {
        await this.deleteLesson(lesson.id);
      }
      return;
    }

    // LocalStorage Fallback
    try {
      const books = (await this.getBooks()).filter((b) => b.id !== id);
      localStorage.setItem(`${DB_NAME}_books`, JSON.stringify(books));
      const lessons = (await this.getAllLessonsRaw()).filter((l) => l.bookId !== id);
      localStorage.setItem(`${DB_NAME}_lessons`, JSON.stringify(lessons));
    } catch (err) {
      console.error(err);
    }
  }

  // ---- Lessons Methods ----
  public async getLessons(bookId: string): Promise<Lesson[]> {
    await this.init();

    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["lessons"], "readonly");
          const store = transaction.objectStore("lessons");
          const index = store.index("bookId");
          const request = index.getAll(bookId);
          request.onsuccess = () => {
            const list: Lesson[] = request.result || [];
            list.sort((a, b) => a.order - b.order);
            resolve(list);
          };
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
    }

    // LocalStorage Fallback
    try {
      const all = await this.getAllLessonsRaw();
      const filtered = all.filter((l) => l.bookId === bookId);
      filtered.sort((a, b) => a.order - b.order);
      return filtered;
    } catch {
      return [];
    }
  }

  private async getAllLessonsRaw(): Promise<Lesson[]> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["lessons"], "readonly");
          const store = transaction.objectStore("lessons");
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
    }

    try {
      const data = localStorage.getItem(`${DB_NAME}_lessons`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public async getLesson(id: string): Promise<Lesson | null> {
    await this.init();

    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["lessons"], "readonly");
          const store = transaction.objectStore("lessons");
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
    }

    const all = await this.getAllLessonsRaw();
    return all.find((l) => l.id === id) || null;
  }

  public async saveLesson(lesson: Lesson): Promise<void> {
    await this.init();

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["lessons"], "readwrite");
          const store = transaction.objectStore("lessons");
          const request = store.put(lesson);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
      return;
    }

    // LocalStorage Fallback
    try {
      const all = await this.getAllLessonsRaw();
      const idx = all.findIndex((l) => l.id === lesson.id);
      if (idx >= 0) all[idx] = lesson;
      else all.push(lesson);
      localStorage.setItem(`${DB_NAME}_lessons`, JSON.stringify(all));
    } catch (err) {
      console.error(err);
    }
  }

  public async saveLessons(lessons: Lesson[]): Promise<void> {
    for (const l of lessons) {
      await this.saveLesson(l);
    }
  }

  public async deleteLesson(id: string): Promise<void> {
    await this.init();

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(["lessons"], "readwrite");
          const store = transaction.objectStore("lessons");
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
      return;
    }

    try {
      const all = (await this.getAllLessonsRaw()).filter((l) => l.id !== id);
      localStorage.setItem(`${DB_NAME}_lessons`, JSON.stringify(all));
    } catch (err) {
      console.error(err);
    }
  }

  public async updateLessonTab(
    lessonId: string,
    tabId: TabId,
    record: TabContentRecord
  ): Promise<Lesson | null> {
    const lesson = await this.getLesson(lessonId);
    if (!lesson) return null;

    if (!lesson.generatedTabs) {
      lesson.generatedTabs = {};
    }
    lesson.generatedTabs[tabId] = record;
    lesson.updatedAt = new Date().toISOString();

    await this.saveLesson(lesson);
    return lesson;
  }

  // ---- Generic Key-Value Stores (schema v2: classes, students, grades, ...) ----
  // Every value must carry an `id` field (except "settings" which uses `key`).
  public async kvPut(store: string, value: any): Promise<void> {
    await this.init();
    if (this.db && this.db.objectStoreNames.contains(store)) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction([store], "readwrite");
          tx.objectStore(store).put(value);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (err) {
          reject(err);
        }
      });
    }
    await this.kvPutLocal(store, value);
  }

  public async kvGet(store: string, key: string): Promise<any | null> {
    await this.init();
    if (this.db && this.db.objectStoreNames.contains(store)) {
      const row = await new Promise<any>((resolve, reject) => {
        try {
          const tx = this.db!.transaction([store], "readonly");
          const req = tx.objectStore(store).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
        }
      });
      if (row !== null) return row;
    }
    return this.kvGetLocal(store, key);
  }

  public async kvGetAll(store: string): Promise<any[]> {
    await this.init();
    if (this.db && this.db.objectStoreNames.contains(store)) {
      const rows = await new Promise<any[]>((resolve, reject) => {
        try {
          const tx = this.db!.transaction([store], "readonly");
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
        }
      });
      if (rows.length > 0) return rows;
    }
    return this.kvGetAllLocal(store);
  }

  public async kvDelete(store: string, key: string): Promise<void> {
    await this.init();
    if (this.db && this.db.objectStoreNames.contains(store)) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction([store], "readwrite");
          tx.objectStore(store).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (err) {
          reject(err);
        }
      });
    }
    const rows = await this.kvGetAllLocal(store);
    const keyField = store === "settings" ? "key" : "id";
    const next = rows.filter((r) => r?.[keyField] !== key);
    localStorage.setItem(`${DB_NAME}_kv_${store}`, JSON.stringify(next));
  }

  private kvFallbackStore(store: string): string {
    return `${DB_NAME}_kv_${store}`;
  }

  private async kvPutLocal(store: string, value: any): Promise<void> {
    const rows = await this.kvGetAllLocal(store);
    const keyField = store === "settings" ? "key" : "id";
    const idx = rows.findIndex((r) => r?.[keyField] === value?.[keyField]);
    if (idx >= 0) rows[idx] = value;
    else rows.push(value);
    localStorage.setItem(this.kvFallbackStore(store), JSON.stringify(rows));
  }

  private async kvGetLocal(store: string, key: string): Promise<any | null> {
    const rows = await this.kvGetAllLocal(store);
    const keyField = store === "settings" ? "key" : "id";
    return rows.find((r) => r?.[keyField] === key) || null;
  }

  private async kvGetAllLocal(store: string): Promise<any[]> {
    try {
      const raw = localStorage.getItem(this.kvFallbackStore(store));
      return raw ? (JSON.parse(raw) as any[]) : [];
    } catch {
      return [];
    }
  }

  public async exportAll(): Promise<string> {
    const books = await this.getBooks();
    const lessons = await this.getAllLessonsRaw();
    const kv: Record<string, any[]> = {};
    for (const store of KV_STORES) {
      kv[store] = await this.kvGetAll(store);
    }
    kv.settings = await this.kvGetAll("settings");
    return JSON.stringify(
      { books, lessons, kv, exportedAt: new Date().toISOString() },
      null,
      2
    );
  }

  public async importAll(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.books) && Array.isArray(parsed.lessons)) {
        for (const b of parsed.books) {
          await this.saveBook(b);
        }
        for (const l of parsed.lessons) {
          await this.saveLesson(l);
        }
        if (parsed.kv && typeof parsed.kv === "object") {
          for (const store of KV_STORES) {
            const rows = parsed.kv[store];
            if (Array.isArray(rows)) {
              for (const row of rows) {
                await this.kvPut(store, row);
              }
            }
          }
          if (Array.isArray(parsed.kv.settings)) {
            for (const row of parsed.kv.settings) {
              await this.kvPut("settings", row);
            }
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to import database", err);
      return false;
    }
  }

  // Seed sample book if database is empty on first run
  public async seedIfEmpty(force: boolean = false): Promise<void> {
    if (!force) {
      const initialized = localStorage.getItem("MahdarAlDurus_seeded");
      if (initialized) return;
    }

    const books = await this.getBooks();
    if (books.length > 0 && !force) {
      localStorage.setItem("MahdarAlDurus_seeded", "true");
      return;
    }

    localStorage.setItem("MahdarAlDurus_seeded", "true");

    const sampleBookId = "book-science-1";
    const sampleBook: Book = {
      id: sampleBookId,
      title: "العلوم العامة: رحلة في الخلية والطبيعة",
      subject: "العلوم الحيوية",
      grade: "المرحلة الإعدادية",
      description: "منهج تفاعلي متكامل يستعرض أسرار الخلية الحية، وعمليات الطاقة الحيوية، وتطبيقاتها العلمية والبيئية.",
      coverTheme: "emerald",
      createdAt: new Date().toISOString(),
      units: [
        {
          unitTitle: "الوحدة الأولى: الخلية وعمليات الحياة",
          lessonIds: ["lesson-1", "lesson-2"],
        },
        {
          unitTitle: "الوحدة الثانية: التفاعلات والطاقة في الأنظمة البيئية",
          lessonIds: ["lesson-3", "lesson-4"],
        },
      ],
    };

    const sampleLessons: Lesson[] = [
      {
        id: "lesson-1",
        bookId: sampleBookId,
        unitTitle: "الوحدة الأولى: الخلية وعمليات الحياة",
        title: "الخلية: وحدة بناء الكائن الحي ووظائف العضيات",
        summary: "التعرف على المكونات الدقيقة للخلية النباتية والحيوانية، ودور النواة والميتوكوندريا والغشاء البلازمي في استمرار الحياة.",
        estimatedDuration: "45 دقيقة",
        keyKeywords: ["الخلية", "الميتوكوندريا", "الغشاء البلازمي", "النواة", "الجدار الخلوي"],
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: `تعتبر الخلية الوحدة التركيبية والوظيفية الأساسية في جميع الكائنات الحية، من البكتيريا وحيدة الخلية إلى الإنسان المعقد. تنقسم الخلايا إلى نوعين رئيسيين: خلايا بدائية النواة (مثل البكتيريا التي تفتقر لغشاء نووي محدد) وخلايا حقيقية النواة (مثل خلايا النباتات والحيوانات والفطريات).
تحتوي الخلية حقيقية النواة على عضيات متخصصة تؤدي وظائف دقيقة تضمن بقاء الكائن الحي:
1. النواة (Nucleus): هي مركز التحكم الإداري في الخلية، حيث تحتوي على المادة الوراثية (DNA) المسؤولة عن نقل الصفات وتوجيه الأنشطة الحيوية.
2. الميتوكوندريا (Mitochondria): تُلقب بمحطات توليد الطاقة، وتحدث فيها عملية التنفس الخلوي لإنتاج جزيئات أدينوسين ثلاثي الفوسفات (ATP) التي تغذي أنشطة الخلية.
3. الغشاء البلازمي (Cell Membrane): غشاء شبه منفذ يحيط بالسيتوبلازم ويتحكم ببراعة في المواد الداخلة والخارجة من الخلية وفق خاصية النفاذية الاختيارية.
4. الريبوسومات والشبكة الإندوبلازمية: مصانع إنتاج البروتينات ونقلها وتعديلها.
تتميز الخلية النباتية بوجود الجدار الخلوي السليلوزي الذي يمنحها القوة والدعامة، والبلاستيدات الخضراء الحاوية للكلوروفيل اللازم للبناء الضوئي، وفجوة عصارية مركزية كبيرة لحفظ الماء والمغذيات.`,
        generatedTabs: {
          summary: {
            format: "markdown",
            content: `### 🌟 زبدة الدرس والأفكار الجوهرية
الخلية ليست مجرد كيس مائي، بل هي مدينة صناعية متناهية الدقة، كل عضية فيها تعمل بتناغم مذهل لضمان استمرار الحياة وتوليد الطاقة وحفظ الشفرة الوراثية.

#### 📌 المحاور الرئيسية:
- **النظرية الخلوية**: جميع الكائنات تتكون من خلايا، والخلية هي وحدة البناء، وتنشأ كل خلية من خلية سابقة بالانقسام.
- **عضيات الخلية الأساسية**:
  1. **النواة**: غرفة القيادة والشفرة الوراثية (DNA).
  2. **الميتوكوندريا**: محطة توليد وقود الحياة (ATP).
  3. **الغشاء الخلوي**: الحارس البواب بالنفاذية الاختيارية.
- **الفارق الجوهري بين النبات والحيوان**: الجدار الخلوي والبلاستيدات الخضراء يميزان الخلية النباتية ويمنحانها الاكتفاء الذاتي في صنع الغذاء.

#### ⚡ نصائح المراجعة الذهبية السريعة:
- تذكر دائماً: **الميتوكوندريا = الطاقة** | **النواة = التحكم** | **الغشاء = النفاذية**.`,
            generatedAt: new Date().toISOString(),
          },
          mindMap: {
            format: "json",
            data: {
              centerTopic: "عالم الخلية الحية",
              description: "البنية والوظائف والعضيات الرئيسية",
              branches: [
                {
                  id: "b1",
                  title: "المركز الإداري (النواة)",
                  color: "emerald",
                  subBranches: [
                    { id: "sb1-1", title: "المادة الوراثية DNA", details: "حفظ الشفرة وتوجيه البروتينات" },
                    { id: "sb1-2", title: "الغلاف النووي والنوية", details: "تنظيم تبادل المواد وتصنيع الريبوسومات" }
                  ]
                },
                {
                  id: "b2",
                  title: "محطات الطاقة والمصانع",
                  color: "amber",
                  subBranches: [
                    { id: "sb2-1", title: "الميتوكوندريا", details: "التنفس الخلوي وإنتاج ATP" },
                    { id: "sb2-2", title: "الريبوسومات", details: "بناء وتخليق البروتينات" }
                  ]
                },
                {
                  id: "b3",
                  title: "الحماية والحدود الخارجية",
                  color: "blue",
                  subBranches: [
                    { id: "sb3-1", title: "الغشاء البلازمي", details: "نفاذية اختيارية لجميع الخلايا" },
                    { id: "sb3-2", title: "الجدار الخلوي", details: "دعامة وحماية خاصة بالخلية النباتية" }
                  ]
                },
                {
                  id: "b4",
                  title: "خصوصيات الخلية النباتية",
                  color: "teal",
                  subBranches: [
                    { id: "sb4-1", title: "البلاستيدات الخضراء", details: "الكلوروفيل والبناء الضوئي" },
                    { id: "sb4-2", title: "الفجوة المركزية الكبيرة", details: "تخزين الماء وضغط الامتلاء" }
                  ]
                }
              ]
            },
            generatedAt: new Date().toISOString(),
          }
        },
      },
      {
        id: "lesson-2",
        bookId: sampleBookId,
        unitTitle: "الوحدة الأولى: الخلية وعمليات الحياة",
        title: "التنفس الخلوي والبناء الضوئي: ثنائية الطاقة",
        summary: "كيف تحول النباتات ضوء الشمس لغذاء، وكيف تحرق الخلايا الجلوكوز لإنتاج طاقة الحركة والنمو.",
        estimatedDuration: "40 دقيقة",
        keyKeywords: ["البناء الضوئي", "التنفس الخلوي", "الجلوكوز", "الأكسجين", "ثاني أكسيد الكربون"],
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: `تعتمد استمرارية الحياة على التوازن الدقيق بين عمليتين حيويتين متعاكستين ومتكاملتين: البناء الضوئي والتنفس الخلوي.
في عملية البناء الضوئي، تستغل النباتات والطحالب صبغة الكلوروفيل داخل البلاستيدات الخضراء لامتصاص طاقة الشمس وتحويل الماء وثاني أكسيد الكربون إلى سكر الجلوكوز، مع إطلاق غاز الأكسجين الضروري لتنفس الكائنات.
بينما في عملية التنفس الخلوي التي تحدث داخل الميتوكوندريا في جميع الخلايا الحية، يتم تفكيك جزيئات الجلوكوز بمساعدة الأكسجين لتحرير الطاقة المخزنة على هيئة ATP، وينتج عن ذلك ثاني أكسيد الكربون والماء، لتبدأ الدورة من جديد.`,
        generatedTabs: {},
      },
      {
        id: "lesson-3",
        bookId: sampleBookId,
        unitTitle: "الوحدة الثانية: التفاعلات والطاقة في الأنظمة البيئية",
        title: "الذرة والروابط الكيميائية الأساسية",
        summary: "استكشاف بنية الذرة (بروتونات، نيوترونات، إلكترونات) والروابط الأيونية والتساهمية.",
        estimatedDuration: "45 دقيقة",
        keyKeywords: ["الذرة", "الإلكترونات", "الرابطة التساهمية", "الرابطة الأيونية", "التكافؤ"],
        order: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: `المادة بكل أشكالها تتكون من ذرات متناهية الصغر. تتكون الذرة من نواة مركزية ثقيلة موجبة الشحنة تحتوي على بروتونات موجبة ونيوترونات متعادلة، وتدور حولها إلكترونات سالبة في مدارات طاقة محددة.
تسعى الذرات للوصول إلى حالة الاستقرار بملء مدارها الخارجي بالإلكترونات من خلال تكوين روابط كيميائية:
1. الرابطة الأيونية: تنشأ من تجاذب كهربائي بين أيون موجب فقد إلكترونات وأيون سالب اكتسبها (مثل ملح الطعام NaCl).
2. الرابطة التساهمية: تنشأ بمشاركة الإلكترونات بين الذرات (مثل جزيء الماء H2O وغاز الأكسجين O2).`,
        generatedTabs: {},
      },
      {
        id: "lesson-4",
        bookId: sampleBookId,
        unitTitle: "الوحدة الثانية: التفاعلات والطاقة في الأنظمة البيئية",
        title: "التفاعلات الكيميائية في البيئة والصناعة",
        summary: "أنواع التفاعلات الكيميائية، ودلائل حدوث التفاعل، وتأثيراتها البيئية الإيجابية والسلبية.",
        estimatedDuration: "50 دقيقة",
        keyKeywords: ["المتفاعلات", "النواتج", "قانون بقاء الكتلة", "التفاعلات الطاردة للحرارة", "الاحتباس الحراري"],
        order: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: `التفاعل الكيميائي هو كسر روابط بين جزيئات المواد المتفاعلة وتكوين روابط جديدة تنتج عنها مواد مختلفة بخصائص جديدة تماماً.
يخضع كل تفاعل كيميائي لقانون بقاء المادة، حيث تكون كتلة المواد الداخلة مساوية لكتلة المواد الناتجة.
تشمل دلائل حدوث التفاعل: تصاعد غاز، تغير اللون، انبعاث حرارة أو ضوء، أو تكون راسب.
تستفيد الصناعات من التفاعلات في إنتاج الأدوية، والأسمدة، والبوليمرات، ولكن احتراق الوقود الأحفوري ينتج غازات مثل ثاني أكسيد الكربون وأكاسيد النيتروجين التي تسهم في ظاهرة التغير المناخي والمطر الحمضي.`,
        generatedTabs: {},
      },
    ];

    await this.saveBook(sampleBook);
    await this.saveLessons(sampleLessons);
  }
}

export const localDb = new LocalDatabase();
