import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mahdara.durus',
  appName: 'محضر الدروس',
  webDir: 'dist',
  backgroundColor: '#059669',
  android: {
    allowMixedContent: false,
    backgroundColor: '#059669',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#059669',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;