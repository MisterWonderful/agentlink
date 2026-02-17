/**
 * PWA Utilities
 *
 * Utilities for Progressive Web App functionality.
 */

export {
  // Service Worker
  registerServiceWorker,
  unregisterServiceWorker,
  checkForUpdates,
  skipWaiting,
  reloadPage,
  updateApp,
  subscribeToMessages,
  getRegistration,
  
  // Installation
  captureInstallPrompt,
  showInstallPrompt,
  isInstallPromptAvailable,
  onAppInstalled,
  
  // Status checks
  isServiceWorkerSupported,
  isOffline,
  isStandalone,
  canInstall,
} from './service-worker-registration';
