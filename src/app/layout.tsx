import type { Metadata } from "next";
import "./globals.css";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { SkipLink } from "@/components/layout/SkipLink";
import { CourseChat } from "@/components/chat/CourseChat";

export const metadata: Metadata = {
  title: "AWS Advanced Networking Course",
  description: "Comprehensive, interactive AWS Advanced Networking course. ANS-C01 aligned.",
  keywords: ["AWS", "networking", "ANS-C01", "cloud", "certification"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SkipLink />
        <ProgressProvider>
          {children}
          <CourseChat />
        </ProgressProvider>
      </body>
    </html>
  );
}
