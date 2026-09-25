# رفع محضر الدروس إلى Flathub — دليل التقديم

> الحساب في Flathub أُنشئ بنفس حساب GitHub (`mohamedewiasabd`). هذه الخطوات جاهزة للتنفيذ وقت ما تقول «تابع» — التقديم يتطلب PR إلى مستودع `flathub/flathub` وتجتاز خطواته فحص `flathubbot` أولاً.

## الملفات الجاهزة هنا

| الملف | الغرض |
| --- | --- |
| `org.mahdara.durus.json` | مانيفست flatpak (بناء من المصدر: Node 22 + Rust + Tauri) |
| `share/applications/org.mahdara.durus.desktop` | قائمة التطبيق |
| `share/metainfo/org.mahdara.durus.metainfo.xml` | بيانات AppStream (مطلوبة من Flathub) |
| `share/icons/hicolor/256x256/apps/org.mahdara.durus.png` | الأيقونة |
| `flathub.json` | إعدادات التقديم |

## خطوات التقديم (عندما تأكد)

1. ادخل `https://flathub.org/setup` وحسابك هو `https://flathub.org/account` (نفس GitHub).
2. ارفع المانيفست بصيغة YAML: حوِّل `org.mahdara.durus.json` إلى `org.mahdara.durus.yml` (كل مفاتيح JSON صالحة في YAML كما هي؛ حذف `flathub.json` من بين مدرجات المشروع).
3. اعمل fork لمستودع `flathub/flathub` وأضف في جذره `org.mahdara.durus.yml` ثم افتح PR بعنوان «New app: org.mahdara.durus».
4. `flathubbot` سيفحص: يجب أن يشمل البناء ملف metainfo في مساره القياسي `share/metainfo/` (✔ جاهز) وأيقونة صالحة (✔).
5. بعد القبول يُعلن التطبيق على Flathub ويعمل أمر التثبيت:
   ```
   flatpak install flathub org.mahdara.durus
   ```

## ملاحظات مهمة للتقديم

- **مفتاح Gemini:** بناء Flathub يتم في سيرفراتهم بلا مفتاح، لكن التطبيق يدعم الآن **المفتاح وقت التشغيل**: يفتح المستخدم «قاعدة البيانات والإعدادات» ← «مفتاح الذكاء الاصطناعي (Gemini)» ويدخل مفتاحه، فيُحفظ محلياً لديه وتعمل أدوات الذكاء الاصطناعي كاملة. لاحظ ذلك في وصف المتجر.
- **Cargo.lock:** مُضمَّن في المستودع (مولَّد بـ `cargo generate-lockfile`) والبناء يستخدم `--locked` لتكرارية كاملة.
- رقم `tag` في المانيفست `v1.1.0` يجب تحديثه مع كل إصدار جديد.

## التحقق محلياً (اختياري — يتطلب flatpak-builder)

```bash
sudo apt install flatpak-builder flatpak
flatpak install flathub org.gnome.Platform//48 org.gnome.Sdk//48
flatpak-builder --install-deps-from=flathub --force-clean build-dir packaging/flathub/org.mahdara.durus.json
flatpak run org.mahdara.durus
```