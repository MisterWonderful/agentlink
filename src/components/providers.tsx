"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      {...props}
    >
      <TooltipProvider delayDuration={0}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "hsl(0, 0%, 12%)",
              border: "1px solid hsl(0, 0%, 20%)",
              color: "hsl(0, 0%, 95%)",
            },
          }}
        />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
