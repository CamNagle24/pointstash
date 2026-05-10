import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/ThemeToggle";
import { MockProvider } from "@/components/layout/MockProvider";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "PointStash — All your fast food points. One dashboard.",
  description:
    "Track McDonald's, Chick-fil-A, Starbucks, and every other fast-food rewards balance in one place. Find the best redemptions and never let a deal expire.",
  metadataBase: new URL("https://pointstash.app"),
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SessionProvider>
            <MockProvider>
              <Toaster>{children}</Toaster>
            </MockProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
