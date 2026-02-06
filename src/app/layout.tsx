import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { SelectionProvider } from "@/components/bulk/selection-provider";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WatchTower - API Health Monitor",
  description: "Monitor your API endpoints with automated health checks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className={inter.className}>
        <TooltipProvider>
          <SelectionProvider>
            <AppShell>{children}</AppShell>
          </SelectionProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
