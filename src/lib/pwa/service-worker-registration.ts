/**
 * Service Worker Registration
 *
 * Handles registration and management of the service worker.
 * Provides functions for registering, unregistering, and updating the SW.
 */

import { toast } from 'sonner';

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 *
 * @param options - Registration options
 * @returns Promise that resolves when registration is complete
 */
export function registerServiceWorker(options: {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
} = {}): void {
  if (!isServiceWorkerSupported()) {
    console.log('[PWA] Service workers are not supported');
    return;
  }

  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PWA] Skipping SW registration in development');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Handle updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New update available');
                options.onUpdate?.(registration);
              } else {
                // First install
                console.log('[PWA] App is cached for offline use');
                options.onSuccess?.(registration);
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}

/**
 * Unregister the service worker
 * Useful for debugging or resetting the app state
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('[PWA] Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if there's a service worker update available
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return !!registration.waiting;
  } catch (error) {
    console.error('[PWA] Update check failed:', error);
    return false;
  }
}

/**
 * Force the waiting service worker to become active
 * This should be called when the user accepts an update
 */
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (registration.waiting) {
    // Send message to SW to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Reload the page to activate the new service worker
 */
export function reloadPage(): void {
  window.location.reload();
}

/**
 * Update the app by skipping waiting and reloading
 */
export async function updateApp(): Promise<void> {
  await skipWaiting();
  reloadPage();
}

/**
 * Subscribe to service worker messages
 */
export function subscribeToMessages(
  callback: (event: MessageEvent) => void
): () => void {
  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    callback(event);
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

/**
 * Get the current service worker registration
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  return navigator.serviceWorker.ready;
}

/**
 * Check if the app is in offline mode
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Check if the app was installed (standalone mode)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for iOS standalone mode
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // Check for display-mode: standalone (Android, desktop)
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return isIosStandalone || isDisplayStandalone;
}

/**
 * Check if the app can be installed (not already installed)
 */
export function canInstall(): boolean {
  return !isStandalone() && isServiceWorkerSupported();
}

/**
 * Prompt for app installation
 *
 * Note: This only works if the beforeinstallprompt event was captured.
 * Returns true if the prompt was shown, false otherwise.
 */
let deferredPrompt: Event | null = null;

/**
 * Capture the beforeinstallprompt event
 * This should be called early in app initialization
 */
export function captureInstallPrompt(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured');
  });
}

/**
 * Show the install prompt
 * Returns true if the prompt was shown, false if not available
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }

  // Show the prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promptEvent = deferredPrompt as any;
  promptEvent.prompt();

  // Wait for the user to respond
  const { outcome } = await promptEvent.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);

  // Clear the deferred prompt
  deferredPrompt = null;

  return outcome === 'accepted';
}

/**
 * Check if the install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Listen for app installed event
 */
export function onAppInstalled(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    callback();
  };

  window.addEventListener('appinstalled', handler);

  return () => {
    window.removeEventListener('appinstalled', handler);
  };
}
