import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppInitializer } from "@/components/layout/app-initializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgentLink - Chat with AI Agents",
    template: "%s | AgentLink",
  },
  description:
    "Mobile-first chat client for self-hosted LLM agents. Connect to OpenClaw, NanoClaw, Ollama, vLLM, and more. Works offline.",
  keywords: [
    "AI",
    "LLM",
    "chat",
    "agents",
    "self-hosted",
    "Ollama",
    "OpenClaw",
    "OpenAI",
    "Claude",
    "PWA",
    "offline",
    "mobile",
    "chatbot",
    "artificial intelligence",
    "local AI",
  ],
  authors: [{ name: "AgentLink" }],
  creator: "AgentLink",
  publisher: "AgentLink",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
    shortcut: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgentLink",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  applicationName: "AgentLink",
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AgentLink",
    title: "AgentLink - Chat with AI Agents",
    description:
      "Mobile-first chat client for self-hosted LLM agents. Connect to OpenClaw, NanoClaw, Ollama, vLLM, and more.",
    url: "/",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgentLink - Chat with AI Agents",
        type: "image/png",
      },
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "AgentLink",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@agentlink",
    creator: "@agentlink",
    title: "AgentLink - Chat with AI Agents",
    description:
      "Mobile-first chat client for self-hosted LLM agents. Works offline.",
    images: {
      url: "/icons/og-image.png",
      alt: "AgentLink - Chat with AI Agents",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "AgentLink",
    "msapplication-TileColor": "#121212",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#121212",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "dark light",
};

/**
 * Root Layout
 *
 * Configures:
 * - Theme provider
 * - Toast provider (Sonner)
 * - App initializer for store hydration and SW registration
 * - Viewport meta tags for PWA
 * - Font loading
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* PWA Tags */}
        <meta name="application-name" content="AgentLink" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AgentLink" />
        <meta name="description" content="Mobile-first chat client for self-hosted LLM agents" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#121212" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Splash screen images for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <Providers>
          <AppInitializer>{children}</AppInitializer>
        </Providers>
      </body>
    </html>
  );
}
