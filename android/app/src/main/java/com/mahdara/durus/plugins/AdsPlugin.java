package com.mahdara.durus.plugins;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * AdMob bridge.
 *
 * <p>Exposes a tiny surface to the web view:
 * <ul>
 *   <li>initialize() — kicks off MobileAds + loads the app-open ad.</li>
 *   <li>preload() — (re)loads the interstitial and rewarded ads.</li>
 *   <li>showAppOpen() / showInterstitial() — fire-and-forget full-screen ads.</li>
 *   <li>showRewarded() — resolves on dismissal with {@code {shown, rewarded}} so the JS
 *       layer knows whether the user actually earned the reward.</li>
 * </ul>
 */
@CapacitorPlugin(name = "AdsPlugin")
public class AdsPlugin extends Plugin {

  private final AdsManager manager = AdsManager.getInstance();

  @PluginMethod
  public void initialize(PluginCall call) {
    manager.init(getContext());
    JSObject ret = new JSObject();
    ret.put("ready", true);
    call.resolve(ret);
  }

  @PluginMethod
  public void preload(PluginCall call) {
    boolean started = manager.preload();
    JSObject ret = new JSObject();
    ret.put("started", started);
    call.resolve(ret);
  }

  @PluginMethod
  public void showAppOpen(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.resolve(shownResult(false));
      return;
    }
    manager.showAppOpen(
        activity,
        new AdsManager.AdShownListener() {
          @Override
          public void onShown(boolean shown) {
            call.resolve(shownResult(shown));
          }
        });
  }

  @PluginMethod
  public void showInterstitial(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.resolve(shownResult(false));
      return;
    }
    call.setKeepAlive(true);
    manager.showInterstitial(
        activity,
        new AdsManager.AdShownListener() {
          @Override
          public void onShown(boolean shown) {
            // The ad either started or not; keep waiting for dismissal to resolve,
            // unless it never started at all.
            if (!shown) {
              call.resolve(shownResult(false));
            }
          }

          @Override
          public void onDismissed() {
            call.resolve(shownResult(true));
          }
        });
  }

  @PluginMethod
  public void showRewarded(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.resolve(rewardResult(false, false));
      return;
    }
    final boolean[] granted = {false};
    call.setKeepAlive(true);
    manager.showRewarded(
        activity,
        new AdsManager.AdShownListener() {
          @Override
          public void onShown(boolean shown) {
            if (!shown) {
              call.resolve(rewardResult(false, false));
            }
          }

          @Override
          public void onRewardGranted() {
            granted[0] = true;
          }

          @Override
          public void onDismissed() {
            boolean wasShown = granted[0];
            call.resolve(rewardResult(wasShown, granted[0]));
          }
        });
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("available", true);
    ret.put("initialized", manager.isInitialized());
    call.resolve(ret);
  }

  private JSObject shownResult(boolean shown) {
    JSObject ret = new JSObject();
    ret.put("shown", shown);
    return ret;
  }

  private JSObject rewardResult(boolean shown, boolean rewarded) {
    JSObject ret = new JSObject();
    ret.put("shown", shown);
    ret.put("rewarded", rewarded);
    return ret;
  }
}