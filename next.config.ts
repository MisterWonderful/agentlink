import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Optimize images for PWA
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
  // Disable Turbopack for PWA compatibility
  turbopack: {},
  
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Cache static assets for PWA
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache manifest.json
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Cache service worker
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
  
  // PWA configuration will be applied conditionally below
};

// Conditionally apply PWA in production
const isProduction = process.env.NODE_ENV === "production";

let finalConfig: NextConfig;

if (isProduction) {
  // Dynamic import for next-pwa to avoid build issues in development
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: false, // Let user control updates via UpdatePrompt
    disable: false,
    buildExcludes: [/middleware-manifest.json$/],
    runtimeCaching: [
      // Cache page requests
      {
        urlPattern: /^https?:\/\/.*\/$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 3,
        },
      },
      // Cache Next.js static files
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      // Cache images
      {
        urlPattern: /\/_next\/image\?.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      // Cache API responses
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 3,
        },
      },
      // Cache agent endpoints (for health checks)
      {
        urlPattern: /^https?:\/\/.*\/(models|health|tags|version)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "agent-health",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60, // 1 minute
          },
          networkTimeoutSeconds: 5,
        },
      },
      // Cache static assets
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      // Cache fonts
      {
        urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      // Cache icons
      {
        urlPattern: /\/icons\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "icons",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      // Fallback for all other requests
      {
        urlPattern: /.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "fallback",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 3,
        },
      },
    ],
    // Fallback page for offline
    fallbacks: {
      document: "/offline",
    },
    // Exclude certain paths from precaching
    publicExcludes: ["!noprecache/**/*"],
  });
  
  finalConfig = withPWA(nextConfig);
} else {
  finalConfig = nextConfig;
}

export default finalConfig;
