import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackRun",
  description:
    "Pick a tool for each deployment phase, press Run, and see if your DevOps flow survives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
