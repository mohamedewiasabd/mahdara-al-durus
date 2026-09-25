# حزم مستودعات لينكس — الدليل الموحّد

يغطي هذا المجلد كل ما يلزم لنشر نسخة لينكس عبر مستودعات التوزيعات المختلفة.

| التوزيعة | المستودع | الملف | الحالة |
| --- | --- | --- | --- |
| Ubuntu / Debian | مباشر (deb) | `.deb` من GitHub Releases | ✅ متاح (من CI) |
| جميع التوزيعات | مباشر (AppImage) | `.AppImage` من GitHub Releases | ✅ متاح (من CI) |
| موزّعة عبر Flathub | Flathub | `packaging/flathub/org.mahdara.durus.json` | ⏳ قيد التقديم (دليل في مجلد flathub) |
| openSUSE / Fedora | OBS | `opensuse/mahdara-al-durus.spec` | ⏳ يحتاج حساب OBS والتقديم |
| Arch Linux | AUR | `AUR/PKGBUILD` | ⏳ يحتاج رفع AUR (بمفتاح SSH) |
| Ubuntu Snap | Snap Store | `snapcraft.yaml` | ⏳ يحتاج حساب Snapcraft والتقديم |

## الروابط المباشرة الحالية (v1.1.0)

- `.deb` (Ubuntu/Debian): `https://github.com/mohamedewiasabd/mahdara-al-durus/releases/download/v1.1.0/mahdara-al-durus_1.1.0_amd64.deb`
- `.AppImage` (جميع التوزيعات):
  `https://github.com/mohamedewiasabd/mahdara-al-durus/releases/download/v1.1.0/mahdara-al-durus_1.1.0_amd64.AppImage`

## أوامر التثبيت في التوزيعات

```bash
# Ubuntu / Debian
curl -L -o mahdara.deb https://github.com/mohamedewiasabd/mahdara-al-durus/releases/download/v1.1.0/mahdara-al-durus_1.1.0_amd64.deb
sudo apt install ./mahdara.deb

# أي توزيعة (AppImage)
chmod +x mahdara-al-durus_1.1.0_amd64.AppImage
./mahdara-al-durus_1.1.0_amd64.AppImage

# Arch (حال قبول AUR)
yay -S mahdara-al-durus

# openSUSE/Fedora (حال قبول OBS)
sudo zypper install mahdara-al-durus
sudo dnf install mahdara-al-durus

# Flathub (حال القبول)
flatpak install flathub org.mahdara.durus

# Snap (حال القبول)
sudo snap install mahdara-al-durus
```

## ملاحظات لكل غلاف

- **PKGBUILD (AUR):** غلاف AppImage بسطر SHA256 حقيقي؛ حدِّث رقم الإصدار وSHA مع كل إصدار.
- **.spec (OBS):** غلاف AppImage؛ عند التقديم على OBS أنشئ مشروعاً وأضف الملف `_service` المرفق (سحب المصادر من GitHub Releases/raw تلقائياً).
- **snapcraft.yaml:** بناء من المصدر مع webkit2gtk-4.1 — إن فشل البناء على Snapcraft اقلب إلى نفس نهج غلاف AppImage. نسخ Flathub/Snap المبنية بلا مفتاح تعمل بالذكاء الاصطناعي عبر «مفتاح وقت التشغيل» من إعدادات التطبيق.

> كل الرموز في هذا المجلد **نُكهرب بناءً على نواتج CI الرسمية**؛ عند طلب النسخ الجديدة تُحدَّث تلقائياً مع كل إصدار.