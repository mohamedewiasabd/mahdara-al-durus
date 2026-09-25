import { Capacitor } from "@capacitor/core";

let adsPlugin: any = null;

function getPlugin(): any {
  if (adsPlugin !== null) return adsPlugin;
  if (Capacitor.isNativePlatform()) {
    try {
      adsPlugin = Capacitor.registerPlugin("AdsPlugin");
      return adsPlugin;
    } catch {
      adsPlugin = null;
    }
  }
  return null;
}

export function adsSupported(): boolean {
  return getPlugin() != null;
}

/** True inside the packaged Capacitor app (Android), false on the web build. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Invisible no-ops on the web build (only the Android plugin does real work). */
export function initAds(): void {
  const plugin = getPlugin();
  if (!plugin) return;
  plugin
    .initialize()
    .then((ret: any) => {
      if (ret && ret.ready) preloadAds();
    })
    .catch((err: any) => console.warn("Ads init failed:", err));
}

export function preloadAds(): void {
  const plugin = getPlugin();
  if (!plugin) return;
  plugin.preload().catch((err: any) => console.warn("Ads preload failed:", err));
}

// ------------------------------------------------------------------ Interstitial
const INTERSTITIAL_COOLDOWN_MS = 60_000;

let lastInterstitialAt = 0;

/**
 * Shows an interstitial ad if it's been long enough since the last one and an ad is ready.
 * Resolves with true when a full-screen ad is actually about to appear.
 */
export async function maybeShowInterstitial(): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return false;

  try {
    const ret = await plugin.showInterstitial({});
    const shown = !!(ret && ret.shown);
    if (shown) lastInterstitialAt = Date.now();
    return shown;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ Rewarded
let rewardInFlight = false;

/** Resolves with whether the user earned the reward. Guards against double taps. */
export async function showRewardedAd(): Promise<{
  shown: boolean;
  rewarded: boolean;
}> {
  const plugin = getPlugin();
  if (!plugin) return { shown: false, rewarded: false };
  if (rewardInFlight) return { shown: false, rewarded: false };
  rewardInFlight = true;
  try {
    const result = await Promise.race([
      plugin.showRewarded({}),
      new Promise<any>((resolve) =>
        setTimeout(() => resolve({ shown: false, rewarded: false }), 120_000)
      ),
    ]);
    return {
      shown: !!(result && result.shown),
      rewarded: !!(result && result.rewarded),
    };
  } catch {
    return { shown: false, rewarded: false };
  } finally {
    rewardInFlight = false;
  }
}

export function rewardedInFlight(): boolean {
  return rewardInFlight;
}