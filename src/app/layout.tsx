import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "DeFi Learning Journey",
  description: "Your personal guide to mastering DeFi protocols and LP strategies",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0A0E14",
          color: "#E0E6ED",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <ConsentGate>
          <Navigation />
          {children}
        </ConsentGate>
      </body>
    </html>
  );
}
