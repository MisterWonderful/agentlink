/**
 * AgentLink Service Worker
 *
 * Custom service worker for:
 * - Caching static assets
 * - Offline fallback page
 * - Background sync for queued messages
 * - Push notifications (future)
 */

// Import Workbox from CDN or local file
importScripts("./workbox-4754cb34.js");

const { 
  precaching, 
  routing, 
  strategies, 
  backgroundSync,
  core 
} = workbox;

const { precacheAndRoute } = precaching;
const { registerRoute, setCatchHandler } = routing;
const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = strategies;
const { Queue } = backgroundSync;
const { clientsClaim, skipWaiting } = core;

// ============================================
// Configuration
// ============================================

const CACHE_NAMES = {
  pages: "pages-cache-v1",
  static: "static-cache-v1",
  images: "images-cache-v1",
  api: "api-cache-v1",
  fallback: "fallback-cache-v1",
};

const OFFLINE_PAGE = "/offline";

// ============================================
// Precaching
// ============================================

// Precache and route (injected by next-pwa)
// self.__WB_MANIFEST will be replaced by next-pwa build
// eslint-disable-next-line no-underscore-dangle
const manifest = self.__WB_MANIFEST || [];
precacheAndRoute(manifest);

// ============================================
// Routing
// ============================================

// Cache pages with NetworkFirst strategy
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: CACHE_NAMES.pages,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          // Only cache valid responses
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// Cache static assets with CacheFirst
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font",
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// Cache images with StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.images,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// Cache API calls with NetworkFirst
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// ============================================
// Background Sync
// ============================================

// Create a queue for failed requests
const messageQueue = new Queue("message-queue", {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log("[SW] Background sync succeeded for:", entry.request.url);
      } catch (error) {
        console.error("[SW] Background sync failed:", error);
        // Put the entry back in the queue
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Listen for background sync events
self.addEventListener("sync", (event) => {
  if (event.tag === "message-queue") {
    event.waitUntil(messageQueue.replayRequests());
  }
});

// ============================================
// Offline Fallback
// ============================================

// Set up offline fallback
setCatchHandler(async ({ event }) => {
  // Return offline page for navigation requests
  if (event.request.destination === "document") {
    const cache = await caches.open(CACHE_NAMES.fallback);
    const cachedResponse = await cache.match(OFFLINE_PAGE);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Return a simple offline message for API requests
  if (event.request.url.includes("/api/")) {
    return new Response(
      JSON.stringify({
        error: "You are offline",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // For other requests, just return an error
  return Response.error();
});

// ============================================
// Push Notifications (Future)
// ============================================

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "default",
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "AgentLink", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If there's already a window open, focus it
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(notificationData.url || "/");
      }
    })
  );
});

// ============================================
// Message Handling
// ============================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        skipWaiting();
        break;

      case "GET_VERSION":
        event.ports[0].postMessage({
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        });
        break;

      case "CLEAR_CACHES":
        event.waitUntil(
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          })
        );
        break;

      default:
        break;
    }
  }
});

// ============================================
// Install & Activate
// ============================================

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  
  event.waitUntil(
    caches.open(CACHE_NAMES.fallback).then((cache) => {
      // Cache offline page
      return cache.add(OFFLINE_PAGE).catch(() => {
        console.warn("[SW] Could not cache offline page");
      });
    })
  );

  // Don't skip waiting automatically - let the app control this
  // skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );

  // Take control of clients immediately
  clientsClaim();
});

// ============================================
// Fetch Handler
// ============================================

self.addEventListener("fetch", (event) => {
  // Don't handle non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle requests
  event.respondWith(
    fetch(event.request).catch(async () => {
      // Try to get from cache
      const cache = await caches.open(CACHE_NAMES.fallback);
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's a navigation request, return offline page
      if (event.request.mode === "navigate") {
        const offlineResponse = await cache.match(OFFLINE_PAGE);
        if (offlineResponse) {
          return offlineResponse;
        }
      }

      // Otherwise, return error
      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
      });
    })
  );
});

// ============================================
// Periodic Background Sync (Future)
// ============================================

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "health-check") {
    event.waitUntil(
      // Could perform periodic health checks here
      Promise.resolve()
    );
  }
});
