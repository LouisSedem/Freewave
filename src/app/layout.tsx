import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from "@/components/layout/app-layout";
import { ViewProvider } from "@/store/view-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreeWave — Stream Free Music",
  description:
    "Stream free music online. Hip Hop, Jazz, Classical, Electronic, R&B, Rock and more. Powered by YouTube & Apple Music.",
  keywords: [
    "FreeWave",
    "music streaming",
    "free music",
    "online music player",
    "YouTube music",
    "Apple Music",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "FreeWave — Stream Free Music",
    description: "Discover and stream free music across every genre.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <ViewProvider>
          <AppLayout>{children}</AppLayout>
        </ViewProvider>
        <Toaster />
      </body>
    </html>
  );
}
