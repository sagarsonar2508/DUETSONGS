/**
 * Native platform integration: app lifecycle, hardware back button, haptics
 * and screen wake-lock. Everything degrades gracefully on the web build.
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { save } from './storage';

type BackHandler = () => boolean;

let backHandler: BackHandler | null = null;
let pauseHandler: (() => void) | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;
let wantWakeLock = false;

export const isNative = Capacitor.isNativePlatform();

/** Register a handler for the hardware back button. Return true if handled. */
export function setBackHandler(fn: BackHandler | null): void {
  backHandler = fn;
}

/** Called when the app goes to the background / loses focus. */
export function setPauseHandler(fn: (() => void) | null): void {
  pauseHandler = fn;
}

function firePause(): void {
  pauseHandler?.();
}

export async function initPlatform(): Promise<void> {
  // Background / foreground
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) firePause();
    else if (wantWakeLock) void acquireWakeLock();
  });
  window.addEventListener('blur', () => {
    if (isNative) firePause();
  });

  if (isNative) {
    try {
      await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) firePause();
        else if (wantWakeLock) void acquireWakeLock();
      });
      // Hardware back: let the current screen handle it, else exit from home.
      await App.addListener('backButton', () => {
        if (backHandler?.()) return;
        void App.exitApp();
      });
    } catch {
      /* plugin unavailable — web fallbacks above still apply */
    }
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffd9ec' });
    } catch {
      /* not supported on this device */
    }
    try {
      await SplashScreen.hide();
    } catch {
      /* no splash plugin */
    }
  }
}

/* -------------------------------- haptics -------------------------------- */

export type HapticKind = 'catch' | 'miss' | 'tap';

export function haptic(kind: HapticKind): void {
  if (!save.settings.haptics) return;
  if (isNative) {
    try {
      if (kind === 'miss') void Haptics.notification({ type: NotificationType.Warning });
      else void Haptics.impact({ style: kind === 'catch' ? ImpactStyle.Light : ImpactStyle.Medium });
      return;
    } catch {
      /* fall through to the web API */
    }
  }
  if (navigator.vibrate) {
    navigator.vibrate(kind === 'miss' ? [40, 30, 40] : 8);
  }
}

/* ------------------------------- wake lock -------------------------------- */

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
}

async function acquireWakeLock(): Promise<void> {
  const nav = navigator as unknown as WakeLockNavigator;
  if (!nav.wakeLock || wakeLock) return;
  try {
    wakeLock = await nav.wakeLock.request('screen');
  } catch {
    wakeLock = null;
  }
}

/** Keep the screen on during gameplay. */
export function keepAwake(on: boolean): void {
  wantWakeLock = on;
  if (on) {
    void acquireWakeLock();
  } else if (wakeLock) {
    void wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
