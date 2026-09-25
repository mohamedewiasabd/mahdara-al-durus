package com.mahdara.durus.plugins;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "TtsPlugin")
public class TtsPlugin extends Plugin {

  private TextToSpeech tts;
  private boolean ready = false;

  @Override
  public void load() {
    tts = new TextToSpeech(getContext(), status -> {
      ready = status == TextToSpeech.SUCCESS;
      if (ready) {
        int result =
            tts.setLanguage(new Locale("ar", "SA"));
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
          int result2 = tts.setLanguage(new Locale("ar"));
          if (result2 != TextToSpeech.LANG_AVAILABLE) {
            tts.setLanguage(Locale.getDefault());
          }
        }
        tts.setOnUtteranceProgressListener(
            new UtteranceProgressListener() {
              @Override
              public void onStart(String utteranceId) {
                JSObject ret = new JSObject();
                ret.put("utteranceId", utteranceId);
                notifyListeners("speechStarted", ret);
              }

              @Override
              public void onDone(String utteranceId) {
                JSObject ret = new JSObject();
                ret.put("utteranceId", utteranceId);
                notifyListeners("speechEnded", ret);
              }

              @Override
              public void onError(String utteranceId) {
                JSObject ret = new JSObject();
                ret.put("utteranceId", utteranceId);
                notifyListeners("speechEnded", ret);
              }
            });
      }
    });
  }

  private void onMainThread(Runnable action) {
    getContext().getMainExecutor().execute(action);
  }

  @PluginMethod
  public void speak(PluginCall call) {
    String text = call.getString("text");
    Float rate = call.getFloat("rate", 1.0f);
    if (text == null || text.trim().isEmpty()) {
      call.reject("نص فارغ");
      return;
    }
    if (!ready || tts == null) {
      call.reject("محرك القراءة غير جاهز بعد");
      return;
    }
    onMainThread(
        () -> {
          tts.setSpeechRate(rate);
          String utteranceId = "u" + System.currentTimeMillis();
          int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
          JSObject ret = new JSObject();
          if (result == TextToSpeech.SUCCESS) {
            ret.put("started", true);
            ret.put("utteranceId", utteranceId);
            call.resolve(ret);
          } else {
            ret.put("started", false);
            call.resolve(ret);
          }
        });
  }

  @PluginMethod
  public void stop(PluginCall call) {
    onMainThread(
        () -> {
          if (tts != null) {
            tts.stop();
          }
          JSObject ret = new JSObject();
          ret.put("stopped", true);
          call.resolve(ret);
        });
  }
}