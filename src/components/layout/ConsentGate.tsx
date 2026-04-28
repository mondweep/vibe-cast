"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "aws-course-privacy-consent-v1";

interface ProfileForm {
  name:         string;
  email:        string;
  linkedinUrl:  string;
  wantsUpdates: boolean;
}

const EMPTY_FORM: ProfileForm = {
  name: "", email: "", linkedinUrl: "", wantsUpdates: false,
};

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [status,  setStatus]  = useState<"loading" | "accepted" | "pending">("loading");
  const [form,    setForm]    = useState<ProfileForm>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    setStatus(stored === "accepted" ? "accepted" : "pending");
  }, []);

  async function accept() {
    setSaving(true);

    // Save learner profile if any fields filled in
    const hasProfile = form.name || form.email || form.linkedinUrl;
    if (hasProfile) {
      try {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:         form.name        || null,
            email:        form.email       || null,
            linkedin_url: form.linkedinUrl || null,
            wants_updates: form.wantsUpdates,
          }),
        });
      } catch {
        // Non-blocking — consent still proceeds even if save fails
      }
    }

    localStorage.setItem(CONSENT_KEY, "accepted");
    setSaving(false);
    setStatus("accepted");
  }

  function update(field: keyof ProfileForm, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  if (status === "loading") return <>{children}</>;
  if (status === "accepted") return <>{children}</>;

  return (
    <>
      {/* Blurred background */}
      <div className="pointer-events-none select-none filter blur-sm brightness-50 fixed inset-0 z-40">
        {children}
      </div>

      {/* Consent modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 overflow-hidden my-4">

          {/* Accent bar */}
          <div className="h-1 w-full bg-primary" />

          <div className="p-7">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-primary font-mono font-bold text-sm">AWS</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">AWS Advanced Networking Course</p>
                <p className="text-[10px] text-muted-foreground font-mono">by Mondweep Chakravorty</p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">Before you continue</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Free, open-source course platform. The <strong className="text-foreground">AI Tutor</strong> records
              your questions and approximate location to help us improve content.
            </p>

            {/* Data summary */}
            <div className="bg-muted/40 border border-border rounded-lg p-3.5 mb-5 space-y-1.5 text-xs text-muted-foreground">
              {[
                ["◈", "AI Tutor questions", "stored to identify learning gaps and build FAQs"],
                ["◍", "Location (country/city)", "derived from IP to understand our learner community"],
                ["◇", "Progress tracking",       "stays in your browser only — never sent to any server"],
                ["○", "No advertising",           "no third-party tracking, no cookies"],
              ].map(([icon, label, desc]) => (
                <div key={label as string} className="flex items-start gap-2.5">
                  <span className="text-primary mt-0.5 shrink-0">{icon}</span>
                  <span><strong className="text-foreground">{label}</strong> — {desc}</span>
                </div>
              ))}
            </div>

            {/* Optional profile toggle */}
            <button
              onClick={() => setShowForm(f => !f)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3.5 py-2.5 mb-4 transition-colors hover:border-primary/40"
            >
              <span className="font-mono">
                {showForm ? "▾" : "▸"} Stay in the loop — share your details <span className="text-muted-foreground/60">(optional)</span>
              </span>
            </button>

            {/* Optional profile fields */}
            {showForm && (
              <div className="mb-5 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Get notified when new modules launch or the course updates. All fields optional.
                </p>

                {[
                  { field: "name",        label: "Your name",         placeholder: "e.g. Alex Smith",                     type: "text"  },
                  { field: "email",       label: "Email address",     placeholder: "e.g. alex@example.com",               type: "email" },
                  { field: "linkedinUrl", label: "LinkedIn profile",  placeholder: "e.g. linkedin.com/in/yourprofile",    type: "url"   },
                ].map(({ field, label, placeholder, type }) => (
                  <div key={field}>
                    <label className="block text-[11px] text-muted-foreground mb-1 font-mono">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={form[field as keyof ProfileForm] as string}
                      onChange={e => update(field as keyof ProfileForm, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                ))}

                <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={form.wantsUpdates}
                    onChange={e => update("wantsUpdates", e.target.checked)}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Yes, notify me about new modules, features, and community events. I can unsubscribe any time.
                  </span>
                </label>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-5">
              Data retained 12 months. Full details in our{" "}
              <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={accept}
                disabled={saving}
                className="flex-1 font-bold"
                size="lg"
              >
                {saving ? "Saving…" : "Accept & Enter Course"}
              </Button>
              <Link href="/privacy" target="_blank" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  Read Privacy Policy
                </Button>
              </Link>
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-4 font-mono">
              Accepting confirms you are 16+ and agree to the privacy policy.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
