Name:           mahdara-al-durus
Version:        1.1.0
Release:        1%{?dist}
Summary:        تطبيق المعلم الذكي لتحويل الكتب والمقررات إلى وحدات ودروس
License:        Custom
URL:            https://github.com/mohamedewiasabd/mahdara-al-durus
# AppImage موقّع من GitHub Releases — يُحمَّل أثناء البناء
Source0:        https://github.com/mohamedewiasabd/mahdara-al-durus/releases/download/v%{version}/mahdara-al-durus_%{version}_amd64.AppImage
Source1:        https://raw.githubusercontent.com/mohamedewiasabd/mahdara-al-durus/main/packaging/flathub/share/applications/org.mahdara.durus.desktop
Source2:        https://raw.githubusercontent.com/mohamedewiasabd/mahdara-al-durus/main/packaging/flathub/share/icons/hicolor/256x256/apps/org.mahdara.durus.png

BuildArch:      noarch
Requires:       fuse2

%description
محضر الدروس هو تطبيق ذكي للمعلمين يحوّل الكتب والمقررات إلى وحدات
ودروس منضّمة ويحفظها محلياً على جهاز المستخدم مع 12 أداة ذكاء اصطناعي.

%prep

%build

%install
install -Dm755 %{SOURCE0} %{buildroot}/usr/share/mahdara-al-durus/mahdara-al-durus.AppImage
ln -s /usr/share/mahdara-al-durus/mahdara-al-durus.AppImage %{buildroot}/usr/bin/mahdara-al-durus
install -Dm644 %{SOURCE1} %{buildroot}/usr/share/applications/org.mahdara.durus.desktop
install -Dm644 %{SOURCE2} %{buildroot}/usr/share/icons/hicolor/256x256/apps/org.mahdara.durus.png
sed -i 's#^Exec=mahdara-al-durus#Exec=/usr/bin/mahdara-al-durus#' %{buildroot}/usr/share/applications/org.mahdara.durus.desktop

%files
/usr/bin/mahdara-al-durus
/usr/share/mahdara-al-durus/mahdara-al-durus.AppImage
/usr/share/applications/org.mahdara.durus.desktop
/usr/share/icons/hicolor/256x256/apps/org.mahdara.durus.png

%changelog
* Sat Sep 26 2026 mohamedewiasabd <mohamedewiasabd@gmail.com> - 1.1.0-1
- أول حزمة RPM (غلاف AppImage) لنسخة 1.1.0