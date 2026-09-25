package com.mahdara.durus.plugins;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.util.Base64;

@CapacitorPlugin(name = "BackupPlugin")
public class BackupPlugin extends Plugin {

  private static final String CREATE_CALLBACK = "createDocumentResult";

  @PluginMethod
  public void createDocument(PluginCall call) {
    String base64 = call.getString("base64");
    String mimeType = call.getString("mimeType", "application/json");
    String fileName = call.getString("fileName", "muhdr-drurus-backup.json");
    if (base64 == null || base64.isEmpty()) {
      call.reject("base64 مفقود");
      return;
    }
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.setType(mimeType);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.putExtra(Intent.EXTRA_TITLE, fileName);
    try {
      startActivityForResult(call, intent, CREATE_CALLBACK);
    } catch (Exception e) {
      call.reject("تعذر فتح نافذة الحفظ: " + e.getMessage());
    }
  }

  @ActivityCallback
  private void createDocumentResult(PluginCall call, ActivityResult result) {
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
      JSObject ret = new JSObject();
      ret.put("saved", false);
      ret.put("canceled", true);
      call.resolve(ret);
      return;
    }
    Uri uri = result.getData().getData();
    try {
      String base64 = call.getString("base64", "");
      byte[] bytes = Base64.getDecoder().decode(base64);
      OutputStream os = getContext().getContentResolver().openOutputStream(uri, "w");
      if (os == null) {
        call.reject("لم يتمكن النظام من فتح الملف الوجهة.");
        return;
      }
      os.write(bytes);
      os.flush();
      os.close();
      JSObject ret = new JSObject();
      ret.put("saved", true);
      ret.put("canceled", false);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("فشل حفظ الملف: " + e.getMessage());
    }
  }
}