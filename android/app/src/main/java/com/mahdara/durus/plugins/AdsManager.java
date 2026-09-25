package com.mahdara.durus.plugins;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.appopen.AppOpenAd;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.mahdara.durus.BuildConfig;

/**
 * Wraps the Google Mobile Ads SDK for this app.
 *
 * - App Open ad: auto-shown when the app returns to foreground (release builds only,
 *   to keep dev/CDP sessions free of over-lays). Loaded at init and reloaded after it is
 *   dismissed or expires.
 * - Interstitial: loaded on {@link #preload()} and shown on demand (JS-driven).
 * - Rewarded: loaded on {@link #preload()} and shown on demand; the reward flag is passed
 *   back to the caller so the JS layer can grant the in-app benefit.
 *
 * In DEBUG builds the public Google test ad unit IDs are used, so the real AdMob units are
 * never pinged during development. The manifest meta-data APPLICATION_ID remains the real
 * app ID in all builds (as required by the SDK).
 */
public final class AdsManager {

  /** Simple callback surface used by the Capacitor plugin. */
  public interface AdShownListener {
    /** @param shown true if a full-screen ad started showing right now. */
    default void onShown(boolean shown) {}

    /** Fired only for rewarded ads when the user has earned the reward. */
    default void onRewardGranted() {}

    /** Fired when the full-screen ad was dismissed (or failed to show). */
    default void onDismissed() {}
  }

  private static final String TEST_APP_OPEN = "ca-app-pub-3940256099942544/9257395921";
  private static final String TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
  private static final String TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917";

  static final String APP_OPEN_AD_ID =
      BuildConfig.DEBUG ? TEST_APP_OPEN : "ca-app-pub-6559329089674801/9215574608";
  static final String INTERSTITIAL_AD_ID =
      BuildConfig.DEBUG ? TEST_INTERSTITIAL : "ca-app-pub-6559329089674801/7902492939";
  static final String REWARDED_AD_ID =
      BuildConfig.DEBUG ? TEST_REWARDED : "ca-app-pub-6559329089674801/3137162122";

  // Never show app-open more often than this, and never show a stale load.
  private static final long APP_OPEN_COOLDOWN_MS = 60_000L;
  private static final long APP_OPEN_MAX_AGE_MS = 4L * 60L * 60L * 1000L;

  private static AdsManager instance;

  public static AdsManager getInstance() {
    if (instance == null) {
      instance = new AdsManager();
    }
    return instance;
  }

  private Context appContext;
  private boolean initialized = false;
  private boolean showing = false;

  private AppOpenAd appOpenAd;
  private long appOpenLoadTime = 0L;
  private long lastAppOpenShownAt = 0L;

  private InterstitialAd interstitial;
  private RewardedAd rewarded;

  private AdsManager() {}

  public void init(Context context) {
    if (appContext == null && context != null) {
      appContext = context.getApplicationContext();
    }
    if (initialized || appContext == null) {
      return;
    }
    MobileAds.initialize(
        appContext,
        initializationStatus -> {
          initialized = true;
          loadAppOpen();
        });
  }

  public boolean isInitialized() {
    return initialized;
  }

  /** Call from MainActivity#onStart (activity returned to foreground). */
  public void onActivityForeground(Activity activity) {
    if (!initialized || showing) {
      return;
    }
    // Auto-show app-open only in release builds so dev/CDP sessions stay clean.
    if (BuildConfig.DEBUG) {
      return;
    }
    maybeShowAppOpen(activity);
  }

  public boolean preload() {
    if (!initialized) {
      return false;
    }
    loadInterstitial();
    loadRewarded();
    return true;
  }

  // ------------------------------------------------------------------ App Open
  private void loadAppOpen() {
    if (appContext == null) {
      return;
    }
    AdRequest request = new AdRequest.Builder().build();
    main(
        () ->
            AppOpenAd.load(
                appContext,
                APP_OPEN_AD_ID,
                request,
                new AppOpenAd.AppOpenAdLoadCallback() {
                  @Override
                  public void onAdLoaded(AppOpenAd ad) {
                    appOpenAd = ad;
                    appOpenLoadTime = System.currentTimeMillis();
                  }

                  @Override
                  public void onAdFailedToLoad(LoadAdError loadAdError) {
                    appOpenAd = null;
                  }
                }));
  }

  private void maybeShowAppOpen(Activity activity) {
    if (appOpenAd == null || activity == null) {
      return;
    }
    long now = System.currentTimeMillis();
    if (now - lastAppOpenShownAt < APP_OPEN_COOLDOWN_MS) {
      return;
    }
    if (now - appOpenLoadTime > APP_OPEN_MAX_AGE_MS) {
      appOpenAd = null;
      loadAppOpen();
      return;
    }
    final AppOpenAd ad = appOpenAd;
    appOpenAd = null;
    lastAppOpenShownAt = now;
    showAppOpenAd(activity, ad);
  }

  public void showAppOpen(Activity activity, AdShownListener listener) {
    if (!initialized) {
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    if (appOpenAd == null) {
      loadAppOpen();
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    final AppOpenAd ad = appOpenAd;
    appOpenAd = null;
    if (listener != null) {
      listener.onShown(true);
    }
    showAppOpenAd(activity, ad);
  }

  private void showAppOpenAd(Activity activity, AppOpenAd ad) {
    main(
        () -> {
          showing = true;
          ad.setFullScreenContentCallback(
              new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                  showing = false;
                  loadAppOpen();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                  showing = false;
                  loadAppOpen();
                }

                @Override
                public void onAdShowedFullScreenContent() {
                  // nothing
                }
              });
          ad.show(activity);
        });
  }

  // ------------------------------------------------------------------ Interstitial
  private void loadInterstitial() {
    if (appContext == null) {
      return;
    }
    AdRequest request = new AdRequest.Builder().build();
    main(
        () ->
            InterstitialAd.load(
                appContext,
                INTERSTITIAL_AD_ID,
                request,
                new InterstitialAdLoadCallback() {
                  @Override
                  public void onAdLoaded(InterstitialAd ad) {
                    interstitial = ad;
                  }

                  @Override
                  public void onAdFailedToLoad(LoadAdError loadAdError) {
                    interstitial = null;
                  }
                }));
  }

  public void showInterstitial(Activity activity, AdShownListener listener) {
    if (!initialized || showing) {
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    final InterstitialAd ad = interstitial;
    if (ad == null) {
      loadInterstitial();
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    interstitial = null;
    if (listener != null) {
      listener.onShown(true);
    }
    main(
        () -> {
          showing = true;
          ad.setFullScreenContentCallback(
              new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                  showing = false;
                  loadInterstitial();
                  if (listener != null) {
                    listener.onDismissed();
                  }
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                  showing = false;
                  loadInterstitial();
                  if (listener != null) {
                    listener.onDismissed();
                  }
                }
              });
          ad.show(activity);
        });
  }

  // ------------------------------------------------------------------ Rewarded
  private void loadRewarded() {
    if (appContext == null) {
      return;
    }
    AdRequest request = new AdRequest.Builder().build();
    main(
        () ->
            RewardedAd.load(
                appContext,
                REWARDED_AD_ID,
                request,
                new RewardedAdLoadCallback() {
                  @Override
                  public void onAdLoaded(RewardedAd ad) {
                    rewarded = ad;
                  }

                  @Override
                  public void onAdFailedToLoad(LoadAdError loadAdError) {
                    rewarded = null;
                  }
                }));
  }

  public void showRewarded(Activity activity, AdShownListener listener) {
    if (!initialized || showing) {
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    final RewardedAd ad = rewarded;
    if (ad == null) {
      loadRewarded();
      if (listener != null) {
        listener.onShown(false);
      }
      return;
    }
    rewarded = null;
    if (listener != null) {
      listener.onShown(true);
    }
    main(
() -> {
              showing = true;
              ad.setFullScreenContentCallback(
                  new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                      showing = false;
                      loadRewarded();
                      if (listener != null) {
                        listener.onDismissed();
                      }
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(AdError adError) {
                      showing = false;
                      loadRewarded();
                      if (listener != null) {
                        listener.onDismissed();
                      }
                    }
                  });

          // Reward granted by the SDK only when the user actually completes the ad.
          AdShownListener finalListener = listener;
          ad.show(
              activity,
              rewardItem -> {
                if (finalListener != null) {
                  finalListener.onRewardGranted();
                }
              });
        });
  }

  private void main(Runnable action) {
    new Handler(Looper.getMainLooper()).post(action);
  }
}