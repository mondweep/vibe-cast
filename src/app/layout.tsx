import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS Advanced Networking Course",
  description:
    "Comprehensive, interactive AWS Advanced Networking course for students, teachers, and practitioners. ANS-C01 aligned.",
  keywords: ["AWS", "networking", "ANS-C01", "cloud", "certification"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
