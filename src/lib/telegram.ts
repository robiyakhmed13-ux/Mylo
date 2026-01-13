// Telegram WebApp environment detection and utilities
// Uses existing type definitions from vite-env.d.ts

/**
 * Detect if running inside Telegram Mini App
 */
export function isTelegramMiniApp(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  );
}

/**
 * Get Telegram WebApp instance
 */
export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Get Telegram initData for authentication (raw query string)
 */
export function getTelegramInitData(): string | null {
  const webApp = getTelegramWebApp();
  // initData is not in our types but exists on the real WebApp object
  return (webApp as any)?.initData || null;
}

/**
 * Get Telegram user info from initDataUnsafe
 */
export function getTelegramUser() {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.user || null;
}

/**
 * Check if user has valid Telegram data
 */
export function hasTelegramAuth(): boolean {
  const initData = getTelegramInitData();
  if (!initData || initData.length === 0) return false;
  
  const user = getTelegramUser();
  if (!user?.id) return false;
  
  return true;
}

/**
 * Get platform type for auth routing
 */
export type AuthPlatform = 'telegram-miniapp' | 'mobile-app' | 'web';

export function getAuthPlatform(): AuthPlatform {
  if (isTelegramMiniApp() && hasTelegramAuth()) {
    return 'telegram-miniapp';
  }
  
  // Detect Capacitor (mobile app)
  if (typeof window !== 'undefined' && 
      ((window as any).Capacitor || navigator.userAgent.includes('Capacitor'))) {
    return 'mobile-app';
  }
  
  return 'web';
}

/**
 * Initialize Telegram WebApp
 */
export function initTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
  }
}
