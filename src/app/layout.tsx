import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
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
      <body className="flex min-h-dvh flex-col antialiased">
        {/* wrapper keeps pages' mx-auto layouts intact; flex-1 pins the footer to the bottom */}
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
