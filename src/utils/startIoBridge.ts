/**
 * Start.io Android SDK Bridge
 * Official Start.io In-App SDK App ID: 207781120
 */

export const START_IO_CONFIG = {
  appId: '207781120',
  testMode: false, // Production live ads enabled
  bannerPosition: 'bottom' as const,
};

export interface StartAppAndroidInterface {
  init?: (appId: string, testMode: boolean) => void;
  showBanner?: (position: string) => void;
  hideBanner?: () => void;
  showInterstitial?: () => void;
  isAvailable?: () => boolean;
}

declare global {
  interface Window {
    StartAppAndroid?: StartAppAndroidInterface;
    StartApp?: StartAppAndroidInterface;
  }
}

/**
 * Checks if the native Start.io Android bridge is active on the current device
 */
export function isNativeStartIoAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(
      (window.StartAppAndroid && typeof window.StartAppAndroid.showBanner === 'function') ||
      (window.StartApp && typeof window.StartApp.showBanner === 'function')
    );
  } catch {
    return false;
  }
}

/**
 * Initialize Start.io Android SDK via native JavaScriptInterface
 */
export function initStartIo(): boolean {
  try {
    if (window.StartAppAndroid?.init) {
      window.StartAppAndroid.init(START_IO_CONFIG.appId, START_IO_CONFIG.testMode);
      return true;
    }
    if (window.StartApp?.init) {
      window.StartApp.init(START_IO_CONFIG.appId, START_IO_CONFIG.testMode);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Start.io Android SDK bridge initialization skipped or failed:', err);
    return false;
  }
}

/**
 * Show non-intrusive Start.io Banner Ad at the dedicated bottom container
 */
export function showStartIoBanner(): boolean {
  try {
    if (window.StartAppAndroid?.showBanner) {
      window.StartAppAndroid.showBanner(START_IO_CONFIG.bannerPosition);
      return true;
    }
    if (window.StartApp?.showBanner) {
      window.StartApp.showBanner(START_IO_CONFIG.bannerPosition);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Start.io banner show failed:', err);
    return false;
  }
}

/**
 * Hide Start.io Banner Ad (e.g. during PDF preview or success screens)
 */
export function hideStartIoBanner(): boolean {
  try {
    if (window.StartAppAndroid?.hideBanner) {
      window.StartAppAndroid.hideBanner();
      return true;
    }
    if (window.StartApp?.hideBanner) {
      window.StartApp.hideBanner();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Start.io banner hide failed:', err);
    return false;
  }
}

/**
 * Show optional Start.io Interstitial Ad on natural break/flow completion
 */
export function showStartIoInterstitial(): boolean {
  try {
    if (window.StartAppAndroid?.showInterstitial) {
      window.StartAppAndroid.showInterstitial();
      return true;
    }
    if (window.StartApp?.showInterstitial) {
      window.StartApp.showInterstitial();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Start.io interstitial show failed:', err);
    return false;
  }
}

