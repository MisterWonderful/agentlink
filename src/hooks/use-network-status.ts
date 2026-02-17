/**
 * useNetworkStatus Hook
 *
 * Hook for monitoring network connectivity state.
 * Provides online/offline status and connection type information.
 */

import { useEffect, useState, useCallback } from 'react';
import { processQueue } from '@/lib/chat/offline-queue';

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the device is online */
  isOnline: boolean;
  /** Connection type (wifi, cellular, ethernet, etc.) */
  connectionType?: string;
  /** Estimated effective bandwidth */
  downlink?: number;
  /** Estimated round-trip time */
  rtt?: number;
  /** Whether the connection is metered */
  saveData?: boolean;
}

/**
 * Hook to monitor network connectivity
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: getConnectionType(),
    downlink: getDownlink(),
    rtt: getRTT(),
    saveData: getSaveData(),
  }));

  // Update connection info from Network Information API
  const updateConnectionInfo = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      connectionType: getConnectionType(),
      downlink: getDownlink(),
      rtt: getRTT(),
      saveData: getSaveData(),
    }));
  }, []);

  useEffect(() => {
    // Handle online event
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));

      // Process any queued messages when back online
      void processQueue();
    };

    // Handle offline event
    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    // Listen for connection changes (Network Information API)
    const connection = getConnection();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, [updateConnectionInfo]);

  return status;
}

/**
 * Get the Network Information API connection object
 */
function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;

  // Type assertion for browser-specific API
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  };

  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

/**
 * Get connection type (wifi, cellular, etc.)
 */
function getConnectionType(): string | undefined {
  const connection = getConnection();
  if (!connection) return undefined;

  // Type assertion for effectiveType
  return (connection as { effectiveType?: string }).effectiveType;
}

/**
 * Get downlink speed estimate
 */
function getDownlink(): number | undefined {
  const connection = getConnection();
  if (!connection) return undefined;

  // Type assertion for downlink
  return (connection as { downlink?: number }).downlink;
}

/**
 * Get round-trip time estimate
 */
function getRTT(): number | undefined {
  const connection = getConnection();
  if (!connection) return undefined;

  // Type assertion for rtt
  return (connection as { rtt?: number }).rtt;
}

/**
 * Get save data preference
 */
function getSaveData(): boolean | undefined {
  const connection = getConnection();
  if (!connection) return undefined;

  // Type assertion for saveData
  return (connection as { saveData?: boolean }).saveData;
}

/**
 * Network Information API type (not fully standard yet)
 */
interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
}
