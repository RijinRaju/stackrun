import type { Metadata } from "next";
import { siteUrl } from "@/lib/share";
import "./globals.css";

const description =
  "Pick a tool for each deployment phase, press Run, and see if your DevOps flow survives.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "StackRun",
  description,
  openGraph: {
    title: "StackRun",
    description,
    siteName: "StackRun",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "StackRun" }],
  },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
