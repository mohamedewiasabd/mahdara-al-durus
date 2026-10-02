# رفع محضر الدروس إلى Flathub — دليل التقديم

> الحساب في Flathub أُنشئ بنفس حساب GitHub (`mohamedewiasabd`). **تم تنفيذ التقديم**: PR `flathub/flathub#10471` — جرت المراجعة والتقديم من قبل `flathubbot`.

## الملفات الجاهزة هنا

| الملف | الغرض |
| --- | --- |
| `org.mahdara.durus.json` | مانيفست flatpak (بناء من المصدر: Node 22 + Rust + Tauri) |
| `share/applications/org.mahdara.durus.desktop` | قائمة التطبيق (تُثبَّت داخل البناء بمسارها القياسي) |
| `share/metainfo/org.mahdara.durus.metainfo.xml` | بيانات AppStream (مطلوبة من Flathub) |
| `share/icons/hicolor/256x256/apps/org.mahdara.durus.png` | الأيقونة |
| `flathub.json` | إعدادات التقديم (لا يُضمَّن في PR التقديم لعدّة إصدارات) |

## الطريقة الحالية للتقديم (تم تنفيذها)

1. عمل fork لمستودع `flathub/flathub` (قالبها الفرع `new-pr` وليس `master`).
2. إنشاء فرع باسم التطبيق انطلاقًا من رأس `new-pr`، وإضافة المانيفست `org.mahdara.durus.json` في جذر الفرع.
3. فتح PR ضد فرع **`new-pr`** بعنوان `Add org.mahdara.durus` (وليست `master`).
4. يُفحص التقديم عبر `flathubbot`/`flatpak-builder` (يجب أن يخرج بناءٌ يثبّت metainfo وأيقونة صالحة — ✔ جاهز).
5. بعد القبول يُنشأ مستودع التطبيق الخاص به مثل `flathub/org.mahdara.durus` وتُمنح كتابة للمطوّر.

## ملاحظات مهمة للتقديم

- **مفتاح Gemini:** بناء Flathub يتم في سيرفراتهم بلا مفتاح، لكن التطبيق يدعم الآن **المفتاح وقت التشغيل**: يفتح المستخدم «قاعدة البيانات والإعدادات» ← «مفتاح الذكاء الاصطناعي (Gemini)» ويدخل مفتاحه، فيُحفظ محلياً لديه وتعمل أدوات الذكاء الاصطناعي كاملة. لاحظ ذلك في وصف المتجر.
- **Cargo.lock:** مُضمَّن في المستودع (مولَّد بـ `cargo generate-lockfile`) والبناء يستخدم `--locked` لتكرارية كاملة، وكذلك `package-lock.json` ليعمل `npm ci`.
- **المعمارية:** أمر نقل Node داخل المانيفست يستخدم `uname -m` ليميز `x64/arm64` («لا يعمل بدون هذا التعديل على aarch64»).
- رقم `tag` في المانيفست `v1.1.0` يجب تحديثه مع كل إصدار جديد.

## التحقق محلياً (اختياري — يتطلب flatpak-builder)

```bash
sudo apt install flatpak-builder flatpak
flatpak install flathub org.gnome.Platform//48 org.gnome.Sdk//48
flatpak-builder --install-deps-from=flathub --force-clean build-dir packaging/flathub/org.mahdara.durus.json
flatpak run org.mahdara.durus
```