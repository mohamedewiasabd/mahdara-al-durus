# محضر الدروس — تعليمات العمل الإلزامية (AGENTS.md)

> هذا الملف إلزامي. **كل تعديل** على أي ملف في هذا المشروع يجب أن يمرّ ببروتوكول الإصدارات الكامل في البند ٤ دون استثناء، ولا يجوز إنهاء الجلسة قبل إتمام الخطوات كلها والرفع إلى GitHub.

## ١) هوية المشروع

- تطبيق «محضر الدروس» — تطبيق ذكي للمعلمين لتحويل الكتب والمقررات إلى وحدات ودروس وحفظها محلياً، مع ١٢ أداة ذكاء اصطناعي (تحضير، تلخيص، خرائط ذهنية، اختبارات، أنشطة، متابعة الطلاب…). النسخ الاحتياطي عبر Google Drive بحساب المستخدم. التقنية: Capacitor 8 + React 19 + Vite 6 + Tailwind 4 + TypeScript، وخادم Express لـ Gemini (في الويب) واتصال مباشر بـ Gemini داخل التطبيق.
- المستودع (عام): `https://github.com/mohamedewiasabd/mahdara-al-durus` — الفرع `main`.
- الإصدار الحالي: `versionName "1.1.0"` / `versionCode 42` (في `android/app/build.gradle`).
- **تصعيد الإصدار تلقائي وإجباري مع كل إصدار** — الخطوة 0 في `script/release-all.sh` ترفع `versionCode` بـ +1 وتصعّد `versionName` (minor افتراضيًا) في ملفات: `android/app/build.gradle`، `src-tauri/tauri.conf.json`، `src-tauri/Cargo.toml`، و`ios/App/App.xcodeproj/project.pbxproj` (MARKETING_VERSION). أسماء ملفات النواتج تتبع الرقم تلقائيًا (مثل `mahdara-al-durus-release-v1.1.0.apk` و`mahdara-al-durus_1.1.0_x64-setup.exe`). أسباب عدم التصعيد المشروعة فقط: خطاف `post-commit` (`MAHDARA_RELEASE=1`)، `MAHDARA_SKIP_BUMP=1`، أو وضع `MAHDARA_FETCH_ONLY=1`.
- الويب: مخرجات `dist/` تعمل عبر خادم `dist/server.cjs` (Express/Gemini) في وضع الإنتاج — تشغيلها: `PORT=3000 GEMINI_API_KEY=... node dist/server.cjs`.

## ٢) مصفوفة المنصات والحالة الفعلية

| المنصة | الحالة | المخرجات الثابتة |
| --- | --- | --- |
| Web | متاحة ✅ | `dist/` (عبر `dist/server.cjs`) |
| Android (إعلانات حقيقية) | متاحة ✅ | `release/apk/mahdara-al-durus-release-v1.1.0.apk` |
| Android (إعلانات تجريبية) | متاحة ✅ | `release/apk/mahdara-al-durus-test-ads-v1.1.0.apk` |
| Android Debug | متاحة ✅ | `release/apk/mahdara-al-durus-debug.apk` |
| Android AAB (بلاي ستور) | متاحة ✅ | `release/play/mahdara-al-durus-release-v1.1.0.aab` |
| Windows سطح المكتب | مدعومة ومُفسَّرة عبر CI ✅ | `release/desktop/windows/` — `mahdara-al-durus_1.1.0_x64-setup.exe` + `.msi` (CI `desktop.yml`) |
| Linux سطح المكتب | مدعومة ومُفسَّرة عبر CI ✅ | `release/desktop/linux/` — `.deb` + `.AppImage` (CI أو محليًا) |
| macOS سطح المكتب | مدعومة ومُفسَّرة عبر CI ✅ | `release/desktop/macos/` — `_aarch64.dmg` (Apple Silicon) + `_x64.dmg` (Intel) (CI `desktop.yml`) |
| iOS (ايفون/ايباد) | البناء ينجح عبر CI ✅ (منتج `.app` غير مُوقَّع) | `release/ipa/` — **IPA مُوقَّع** يتطلب أسرار Apple (انظر بند ٣) |

> أسماء ملفات الأندرويد/سطح المكتب **تتبع رقم الإصدار تلقائيًا** مع كل تشغيل — الأسماء أعلاه للنسخة الحالية (1.1.0).

- **الإعلانات (AdMob) تعمل على Android فقط** عبر مكوّن أصلي مكتوب يدويًا (`AdsPlugin`). على الويب وسطح المكتب (Tauri) والايفون لا إعلانات — `src/utils/ads.ts` ينسحب بأمان إذا غاب المكوّن.
- **مفتاح Gemini** يُضمَّن وقت البناء من `VITE_GEMINI_API_KEY` (في `.env.local` محليًا، أو السر `VITE_GEMINI_API_KEY` في GitHub Actions للمستودع). داخل التطبيق (Android/ايفون/سطح المكتب Tauri) يُستدعى Gemini مباشرة من العميل عبر `src/services/geminiDirect.ts`؛ وفي الويب عبر خادم `server.ts`. لا يُرفع المفتاح أبدًا إلى المستودع.
- في توزيعات سطح المكتب لا يوجد خادم Express — لهذا يعامل Tauri كـ«أصلي» في `src/services/ai.ts` (كشف `window.__TAURI_INTERNALS__`) لاستدعاء Gemini مباشرة.
- الـ Linux محليًا يتطلب أولًا: `sudo apt install libwebkit2gtk-4.1-dev build-essential libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` ثم `npm run desktop:build:linux`.
- الحصول على **IPA نهائي** يحتاج توقيع Apple (Certificate + Provisioning Profile) من حساب المطوّر.
- عند طلب جلسة بناء: إن تعذّر البناء محليًا لمنصة (مكتبات نظام/ماك)، يُذكر ذلك بوضوح مع مرجع سطر العمل المُنفِّذ بدلًا من اختلاق ملفات.

## ٣) متطلبات البناء

1. **Node 22** (النظام فيه Node 18 أصلاً — لا يعمل مع Capacitor 8):
   `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`
2. **Rust stable** لسطح المكتب (Tauri): `export PATH="$HOME/.cargo/bin:$PATH"` (rustc >= 1.77).
3. فحص ثم بناء الويب بأمرين إجباريين بعد أي تعديل:
   `npm run lint` (يساوي `tsc --noEmit`) ثم `npm run build` (يساوي `vite build && esbuild server.ts`) — **صفر أخطاء**.
4. التوقيع: `android/keystore.properties` + `android/keystore/mahdara-release.keystore` — **أسرار، لا تُرفع أبدًا**. (توقيع Apple لـ iOS يتم عبر CI عند توفّر الأسرار)
5. الإعلانات: بناء بدون `VITE_ADS_TEST_MODE` = معرّفات AdMob الحقيقية؛ و`VITE_ADS_TEST_MODE=true` = عينات الاختبار. (Android فقط)
6. بنية سطح المكتب موجودة في `src-tauri/` (Tauri v2) ومنصة ايفون في `ios/` (Capacitor) — كلاهما يعتمد نفس ويب `dist/`.
7. **iOS في Capacitor 8.5+**: حزمة `capacitor-swift-pm` الثنائية مبنية مع العلم التجريبي `NonescapableTypes`؛ لتجميع المكوّنات القديمة (`@capacitor/share`, `@capacitor/filesystem`) في `ios.yml` تُحقن خطوة "Patch plugins Swift API" تستبدل في هر `Package.swift` كل مكوّن بإضافة `swiftSettings: [.enableExperimentalFeature("NonescapableTypes")]` — لا تُلغِ هذه الخطوة.
8. **Desktop CI**: لا يُستخدم `tauri-apps/tauri-action` لأن محرك bun يكسر الطلب — البناء المباشر عبر `npm run tauri -- build [--target X]`، ورفع الأرتيفاكتات من `src-tauri/target/*/release/bundle/**` (مسار يغطي الرؤوس المتقاطعة على Mac).
9. **مفتاح Gemini في CI**: يحتاج المستودع سر `VITE_GEMINI_API_KEY` كي تخرج نسخ سطح المكتب والايفون قابلة للعمل بالذكاء الاصطناعي (وإلا تُبنى الأنسخة بلا مفتاح).

## ٤) البروتوكول الإلزامي بعد كل تعديل (بالترتيب)

> **الأمر الواحد الإلزامي:** `npm run release` (= `bash script/release-all.sh`) يَنفّذ الخطوات ٠→٦ كلها (تصعيد الإصدار + بناء النسخ الأربع + التحقق + الالتزام + الرفع + جلب نواتج CI) بنفس الترتيب أدناه.
> **آليًا «فور كل تعديل»:** الخطاف `.git/hooks/post-commit` يشغّل السكربت تلقائيًا بعد **كل** التزام — يُعيد بناء كل النسخ ويتحقق ويرفع إلى GitHub ويجلب نواتج سطح المكتب/ايفون من CI من تلقاء نفسه. سجل التشغيل في `.release-last.log` (جذر المشروع). الخطاف يُضبط `MAHDARA_RELEASE=1` (من أسباب عدم التصعيد المشروعة) فيتجنّب العودية وتكرار تصعيد الإصدار.
> إذا فشل البناء يبقى الالتزام محليًا ويعرض الخطاف السجل — أصلح ثم أعد `npm run release`.

### الخطوة 0 — تصعيد رقم الإصدار (إجباري وتلقائي)
الخطوة 0 في `script/release-all.sh` تنفّذ تلقائيًا مع كل تشغيل:
- تقرأ `versionCode`/`versionName` من `android/app/build.gradle` وترفع `versionCode` **+1** وتصعّد `versionName` (minor افتراضيًا؛ يمكن تغييره عبر `MAHDARA_VERSION_BUMP=patch|major`).
- توازن `"version"` في `src-tauri/tauri.conf.json` و `src-tauri/Cargo.toml` و `MARKETING_VERSION` في `ios/App/App.xcodeproj/project.pbxproj`.
- كل أسماء النواتج (APK/AAB/نواتج CI) تتبع الرقم الجديد تلقائيًا.
- **هام:** دون تصعيد لن يكتشف المستخدمون أو بلاي ستور التحديث (نفس `versionCode`). أسباب إيقاف التصعيد المشروعة فقط: `MAHDARA_RELEASE=1` (من الخطاف)، `MAHDARA_SKIP_BUMP=1`، أو `MAHDARA_FETCH_ONLY=1`. للجلب فقط دون بناء: `MAHDARA_FETCH_ONLY=1 npm run release`.

### الخطوة 1 — الفحص والويب
```bash
npm run lint
npm run build
```

### الخطوة 2 — إصدارات Android الأربعة

أ) النسخة التجريبية (إعلانات اختبار):
```bash
VITE_ADS_TEST_MODE=true npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
cd ..
cp android/app/build/outputs/apk/release/app-release.apk release/apk/mahdara-al-durus-test-ads-v1.1.0.apk
```

ب) النسخة الحقيقية + ملف البلاي (AAB):
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease bundleRelease
cd ..
cp android/app/build/outputs/apk/release/app-release.apk release/apk/mahdara-al-durus-release-v1.1.0.apk
cp android/app/build/outputs/bundle/release/app-release.aab release/play/mahdara-al-durus-release-v1.1.0.aab
```

ج) نسخة التطوير (Debug):
```bash
cd android && ./gradlew assembleDebug
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk release/apk/mahdara-al-durus-debug.apk
```

### الخطوة 3 — الويندوز / لينكس / ماك / ايفون

سطح المكتب (Tauri) — إن كان الجهاز محليًا يملك المتطلبات:
```bash
npm run desktop:build                       # كل أهداف النظام الحالي
npm run desktop:build:linux                 # لينكس: deb + AppImage فقط
```
النسخ الناتجة تُوضع في `src-tauri/target/release/bundle/` وتُنقل إلى `release/desktop/{windows,linux,macos}/` حسب النظام. إن كان البناء يعتمد على CI فهذه هم سطور العمل المنفِّذة:
`.github/workflows/desktop.yml` (Windows/Linux/macOS) و`.github/workflows/ios.yml` (ايفون/ايباد).

ايفون (Capacitor):
```bash
npx cap sync ios                            # مزامنة الويب مع بنية ios/ (تعمل على أي نظام)
```
بناء Xcode الفعلي وإنتاج IPA يحتاج macOS (يتوفر عبر `ios.yml` مع توقيع Apple).
للحصول على **IPA مُوقَّع** أضف هذه الأسرار في إعدادات المستودع (Settings → Secrets) — بدونها يبني السطر `.app` غير مُوقَّع فقط:
`APPLE_CERT_P12` (شهادة المطوّر بصيغة base64)، `APPLE_CERT_PASSWORD`، `APPLE_PROFILE_MOBILEPROVISION` (ملف Provisioning بالـ base64)، `APPLE_TEAM_ID`.

عند التعذّر محليًا (مكتبات نظام/ماك): اذكر ذلك بوضوح مع مرجع سطر العمل بدلًا من اختلاق ملفات.

### الخطوة 6 — جلب نواتج سطح المكتب/ايفون من CI (تلقائي)
بعد الرفع، ينتظر `release-all.sh` إتمام سطرَي العمل `desktop.yml` (مصفوفة: Ubuntu→لينكس، Windows، macOS intel/aarch64) و`ios.yml` ثم ينزّل الأرتيفاكتات عبر GitHub API (التوكن من `~/.git-credentials`) ويفكّها:
- `mahdara-desktop-{ubuntu-22.04,windows-latest,macos-15-intel,macos-26}` → `release/desktop/{linux,windows,macos}/`
- `mahdara-ios-{app-unsigned,ipa-signed}` → `release/ipa/`
مع طباعة MD5 لكل ملف. المهلة 25 دقيقة؛ إن انتهت فالتشغيل القادم يكمل. لإيقاف الانتظار مؤقتًا: `MAHDARA_FETCH_CI=0`. للجلب لاحقًا منفردًا (دون البناء أو تصعيد الإصدار): `MAHDARA_FETCH_ONLY=1 npm run release`.

### الخطوة 4 — التحقق من النواتج
```bash
$HOME/Android/Sdk/build-tools/35.0.0/apksigner verify --print-certs release/apk/*.apk
md5sum release/apk/*.apk release/play/*.aab
```
التحقق إجباري لكل ملف ناتج قبل الرفع.

### الخطوة 5 — الالتزام والرفع (إلزامي)
```bash
git add -A
git diff --cached --name-only | grep -Ei "keystore|keystore.properties|ghp_|local.properties|\.env\.local"   # يجب أن يكون فارغًا
git commit -m "وصف واضح بالعربية للتعديل"
git push origin main
```

### الخطوة 6 — تقرير للمستخدم (بالعربية)
قائمة بكل ملف ناتج: الاسم + الحجم + MD5، وتأكيد إتمام الرفع مع رابط المستودع.

## ٥) حدود حمراء (ممنوع نهائيًا)
- **أبدًا** لا تُرفع: مفتاح التوقيع (`android/keystore/`، `release/keystore/`)، `android/keystore.properties`، `android/local.properties`، ملفات `.env*` الحقيقية، رموز/Passwords/Tokens (ومنها `GEMINI_API_KEY`/`VITE_GEMINI_API_KEY`).
- لا تتجاوز أيًّا من خطوات البند ٤ (بما فيها **الخطوة 0 تصعيد الإصدار**)، ولا تنهي الجلسة قبل الرفع.
- عند كل إصدار يتصاعد الرقم تلقائيًا (الخطوة 0) — اسماء الملفات في البند ٢ تتبع الرقم الجديد، وأبلغ المستخدم بالإصدار الجديد وقيمة `versionCode` قبل الإرسال إلى بلاي ستور.

## ٦) مواضع الملفات
- تُرفع: `src/`، `android/` (ما عدا الأسرار)، `src-tauri/`، `ios/`، `.github/workflows/`، `index.html`، إعدادات البناء، `release/store/` (صور المتجر)، `release/PLAY-LISTING.md`.
- لا تُرفع (محجوبة في `.gitignore`): `release/apk/`، `release/play/`، `release/keystore/`، `release/desktop/`، `release/ipa/`.