import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'media.gsharp.animalduet',
  appName: 'Animal Duet',
  webDir: 'dist',
  android: {
    backgroundColor: '#ffd9ec',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffd9ec',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
