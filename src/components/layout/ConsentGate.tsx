"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "aws-course-privacy-consent-v1";

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "accepted" | "pending">("loading");

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    setStatus(stored === "accepted" ? "accepted" : "pending");
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setStatus("accepted");
  }

  // Don't block render on first paint
  if (status === "loading") return <>{children}</>;
  if (status === "accepted") return <>{children}</>;

  // Consent required
  return (
    <>
      {/* Blurred background — course content visible but inaccessible */}
      <div className="pointer-events-none select-none filter blur-sm brightness-50 fixed inset-0 z-40">
        {children}
      </div>

      {/* Consent modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 overflow-hidden">

          {/* Amber accent bar */}
          <div className="h-1 w-full bg-primary" />

          <div className="p-8">
            {/* Logo / course identity */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-mono font-bold text-sm">AWS</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">AWS Advanced Networking Course</p>
                <p className="text-[10px] text-muted-foreground font-mono">by Mondweep Chakravorty</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-3">
              Before you continue
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              This is a free, open-source learning platform. To help us improve it and plan future content,
              the <strong className="text-foreground">AI Tutor</strong> records your questions, the topics
              you explore, and your approximate location (country/city from IP address).
            </p>

            <div className="bg-muted/40 border border-border rounded-lg p-4 mb-5 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">◈</span>
                <span><strong className="text-foreground">AI Tutor questions</strong> are stored to identify the most common learning gaps and build supplementary content</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">◍</span>
                <span><strong className="text-foreground">Location data</strong> (country + city, from IP) helps us understand our learner community</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">◇</span>
                <span><strong className="text-foreground">Progress tracking</strong> stays in your browser only — never sent to any server</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 shrink-0">○</span>
                <span><strong className="text-foreground">No advertising</strong>, no third-party tracking, no cookies</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Data is retained for 12 months. You can request deletion at any time. Full details in our{" "}
              <Link href="/privacy" target="_blank" className="text-primary hover:underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={accept}
                className="flex-1 font-bold"
                size="lg"
              >
                Accept & Enter Course
              </Button>
              <Link href="/privacy" target="_blank" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  Read Privacy Policy
                </Button>
              </Link>
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-4 font-mono">
              By accepting you confirm you are 16 or older and agree to the privacy policy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
