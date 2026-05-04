"use client";

import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/constants";

export default function ConsentGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasConsent, setHasConsent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "true") {
      setHasConsent(true);
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#0A0E14",
          color: "#E0E6ED",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#0A0E14",
          color: "#E0E6ED",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            backgroundColor: "#0F131A",
            border: "1px solid #1A1F2E",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 28,
              marginBottom: 20,
              color: "#E0E6ED",
            }}
          >
            Privacy & Learning
          </h1>

          <div
            style={{
              marginBottom: 30,
              textAlign: "left",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#B0B8C4",
            }}
          >
            <p>
              This app helps you track your DeFi learning journey. To do that, we:
            </p>
            <ul style={{ marginLeft: 20, marginTop: 10 }}>
              <li>Store your progress locally in your browser</li>
              <li>
                Optionally sync with Supabase for cloud backup (only if you
                configure it)
              </li>
              <li>Use the Anthropic Claude API for AI tutor responses</li>
              <li>Never share your data with third parties</li>
            </ul>

            <p style={{ marginTop: 20 }}>
              Your learning data is yours. Full privacy policy:{" "}
              <a
                href="/privacy"
                style={{
                  color: "#00C2CB",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                read here
              </a>
              .
            </p>
          </div>

          <button
            onClick={() => {
              localStorage.setItem(CONSENT_KEY, "true");
              setHasConsent(true);
            }}
            style={{
              backgroundColor: "#00C2CB",
              color: "#0A0E14",
              border: "none",
              padding: "12px 32px",
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#00B4BD";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#00C2CB";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            I understand, let's learn
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
