package com.mahdara.durus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.mahdara.durus.plugins.AdsManager;
import com.mahdara.durus.plugins.AdsPlugin;
import com.mahdara.durus.plugins.BackupPlugin;
import com.mahdara.durus.plugins.TtsPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(BackupPlugin.class);
    registerPlugin(TtsPlugin.class);
    registerPlugin(AdsPlugin.class);
    super.onCreate(savedInstanceState);
    AdsManager.getInstance().init(this);
  }

  @Override
  public void onStart() {
    super.onStart();
    // App returns to foreground -> possibly show the (already loaded) App Open ad.
    AdsManager.getInstance().onActivityForeground(this);
  }
}