// Our Apps service: fetches app listings from Firestore, caches them locally,
// and refreshes the cache every 10 days (or on demand) when network is available.

const FIRESTORE_URL =
  "https://firestore.googleapis.com/v1/projects/gen-lang-client-0686392114/databases/ai-studio-khutbahcraft-519fc26c-c7b7-46e1-950b-9ad5d5b26399/documents:runQuery";

const CACHE_KEY = "our_apps_cache";
const CACHE_TS_KEY = "our_apps_cache_ts";
const REFRESH_DAYS = 10;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

export interface OurApp {
  id: string;
  name: string;
  details?: string;
  packageName?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface LoadAppsResult {
  apps: OurApp[];
  fromCache: boolean;
  updated: boolean;
}

// Convert a Firestore field value into a plain JS value.
function parseFirestoreValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.referenceValue !== undefined) return value.referenceValue;
  if (value.geoPointValue !== undefined) return value.geoPointValue;
  if (value.bytesValue !== undefined) return value.bytesValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    const fields = value.mapValue.fields || {};
    const out: Record<string, any> = {};
    for (const key of Object.keys(fields)) {
      out[key] = parseFirestoreValue(fields[key]);
    }
    return out;
  }
  return value;
}

// POST a runQuery to Firestore and return parsed documents.
export async function fetchAppsFromFirestore(): Promise<OurApp[]> {
  const res = await fetch(FIRESTORE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "apps" }],
        orderBy: [
          { field: { fieldPath: "createdAt" }, direction: "ASCENDING" },
        ],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`تعذر جلب قائمة التطبيقات (${res.status})`);
  }

  const payload = await res.json();
  const arr = Array.isArray(payload) ? payload : [];

  return arr
    .filter((item: any) => item && item.document)
    .map((item: any) => {
      const doc = item.document;
      const fieldsRaw = doc.fields || {};
      const fields: Record<string, any> = {};
      for (const key of Object.keys(fieldsRaw)) {
        fields[key] = parseFirestoreValue(fieldsRaw[key]);
      }
      const id = (doc.name || "").split("/").pop() || "";
      return { id, ...fields } as OurApp;
    });
}

export function getCachedApps(): OurApp[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read apps cache", err);
    return [];
  }
}

export function isCacheFresh(): boolean {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
    if (!ts) return false;
    return Date.now() - ts < REFRESH_MS;
  } catch {
    return false;
  }
}

export function saveAppsCache(apps: OurApp[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(apps));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (err) {
    console.warn("Failed to save apps cache", err);
  }
}

export async function refreshApps(): Promise<OurApp[]> {
  const fresh = await fetchAppsFromFirestore();
  saveAppsCache(fresh);
  return fresh;
}

// Load apps smartly:
//  - Return cached data instantly when available and fresh.
//  - Otherwise fetch from network (and store locally).
//  - If the cache is stale and network fails, keep showing the cached copy.
export async function loadApps(
  opts: { force?: boolean } = {}
): Promise<LoadAppsResult> {
  const cached = getCachedApps();
  const fresh = isCacheFresh();

  if (!opts.force && fresh && cached.length > 0) {
    return { apps: cached, fromCache: true, updated: false };
  }

  try {
    const apps = await refreshApps();
    return { apps, fromCache: false, updated: true };
  } catch (err) {
    console.warn("Network refresh failed, using cached apps", err);
    return { apps: cached, fromCache: cached.length > 0, updated: false };
  }
}

// Always show cached data first, then silently refresh from the network
// when the app is open and a connection is available.
export async function loadAppsWithBackgroundRefresh(
  onResult: (res: LoadAppsResult) => void
): Promise<void> {
  const cached = getCachedApps();
  if (cached.length > 0) {
    onResult({ apps: cached, fromCache: true, updated: false });
    if (isCacheFresh()) return;
  }

  try {
    const apps = await refreshApps();
    onResult({ apps, fromCache: false, updated: true });
  } catch (err) {
    console.warn("Background refresh failed", err);
  }
}

export function getAppsCacheAgeDays(): number | null {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
    if (!ts) return null;
    return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

export function openAppLink(app: OurApp): void {
  const target =
    app.url ||
    (app.packageName
      ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}`
      : "");
  if (!target) return;
  // Capacitor / system browser for native; same-tab fallback on web
  window.open(target, "_system");
}