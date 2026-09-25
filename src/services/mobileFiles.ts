import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!cap && (cap.isNativePlatform ? cap.isNativePlatform() : !!cap.getPlatform && cap.getPlatform() !== "web");
}

export async function saveFileToDevice({
  filename,
  data,
  mimeType = "application/json",
}: {
  filename: string;
  data: string;
  mimeType?: string;
}): Promise<string> {
  const path = `${filename}`;

  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const uri = await Filesystem.getUri({ path, directory: Directory.Documents });
  return uri.uri;
}

/**
 * Result of writing a file + attempting to open the system Share sheet.
 */
export interface ShareResult {
  /** file:// URI of the saved file */
  uri: string;
  /** true when the system Share sheet was successfully opened */
  shared: boolean;
}

/**
 * Write a file to the app Documents folder and open the system Share sheet.
 * `data` is raw binary base64 when `asBase64` is true, otherwise plain text (UTF-8).
 *
 * NOTE: never gate on `window.Share` / `navigator.share` here — inside the
 * Capacitor WebView the Web Share API may be undefined, but the native
 * @capacitor/share plugin still works. We always try the plugin on native.
 */
export async function writeAndShareFile({
  filename,
  data,
  mimeType = "text/plain",
  asBase64 = false,
  dialogTitle = "مشاركة / حفظ الملف",
}: {
  filename: string;
  data: string;
  mimeType?: string;
  asBase64?: boolean;
  dialogTitle?: string;
}): Promise<ShareResult> {
  if (asBase64) {
    await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
  } else {
    await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  }

  const uri = (await Filesystem.getUri({ path: filename, directory: Directory.Documents })).uri;

  let shared = false;
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: dialogTitle,
        text: dialogTitle,
        url: uri,
        dialogTitle,
      });
      shared = true;
    } catch (e) {
      console.warn("Share sheet failed to open:", e);
    }
  }
  return { uri, shared };
}

/** Convert a Blob (binary file) into a raw base64 string. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Convert an ArrayBuffer into a raw base64 string. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportAndShareBackup(jsonStr: string, baseFilename: string): Promise<void> {
  const uri = await saveFileToDevice({
    filename: baseFilename,
    data: jsonStr,
    mimeType: "application/json",
  });

  // Share the saved file using the system share sheet (also acts as manual save)
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: "نسخة احتياطية - محضر الدروس",
        text: "ملف النسخة الاحتياطية من تطبيق محضر الدروس",
        url: uri,
        dialogTitle: "مشاركة / حفظ النسخة الاحتياطية",
      });
    } catch (e) {
      console.warn("Share failed", e);
    }
  }
}

/**
 * Export backup through the Android SAF "Save to" picker (ACTION_CREATE_DOCUMENT).
 * The system document picker lists Google Drive (and local storage) providers, so
 * the teacher can save the backup straight into their own Drive. No extra login or
 * Google OAuth keys are needed — it uses the Drive account linked to the device.
 *
 * On failure or cancellation it falls back to writing to Documents + Share.
 */
export async function exportBackupToDrive(
  jsonStr: string,
  baseFilename: string
): Promise<"drive" | "share"> {
  if (isNativeApp()) {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform?.()) {
        const Plugin = Capacitor.registerPlugin<{
          createDocument: (options: {
            base64: string;
            mimeType?: string;
            fileName?: string;
          }) => Promise<{ saved: boolean; canceled?: boolean }>;
        }>("BackupPlugin");
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const res = await Plugin.createDocument({
          base64,
          mimeType: "application/json",
          fileName: baseFilename,
        });
        if (res.saved) return "drive";
      }
    } catch (e) {
      console.warn("SAF Drive export failed, falling back to share:", e);
    }
  }
  await exportAndShareBackup(jsonStr, baseFilename);
  return "share";
}

/** Export backup through the OS document picker (Google Drive readable). */
export async function exportBackupToDriveSafe(
  jsonStr: string,
  baseFilename: string
): Promise<"drive" | "share"> {
  return exportBackupToDrive(jsonStr, baseFilename);
}