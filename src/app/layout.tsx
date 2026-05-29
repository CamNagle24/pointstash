import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/ThemeToggle";
import { MockProvider } from "@/components/layout/MockProvider";
import { SessionProvider } from "@/components/layout/SessionProvider";
import { PWAProvider } from "@/components/layout/PWAProvider";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "PointStash — All your fast food points. One dashboard.",
  description:
    "Track McDonald's, Chick-fil-A, Starbucks, and every other fast-food rewards balance in one place. Find the best redemptions and never let a deal expire.",
  metadataBase: new URL("https://pointstash.app"),
  applicationName: "PointStash",
  appleWebApp: {
    capable: true,
    title: "PointStash",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  // Lock zoom on iOS standalone so pinch-zoom doesn't fight the layout when
  // the app is launched from the home screen.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SessionProvider>
            <PWAProvider>
              <MockProvider>
                <Toaster>{children}</Toaster>
              </MockProvider>
            </PWAProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
