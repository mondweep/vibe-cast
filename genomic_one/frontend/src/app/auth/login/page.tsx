"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Button } from "@heroui/react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const result = login(email, password);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Login failed");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="font-mono text-lg font-bold tracking-tight mb-1"
            style={{ color: "var(--accent-teal)" }}
          >
            GENOMIC ONE
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={setEmail}
            variant="bordered"
            isRequired
            classNames={{
              inputWrapper: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
              label: "text-[var(--text-muted)]",
              input: "text-[var(--text-primary)]",
            }}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={setPassword}
            variant="bordered"
            isRequired
            classNames={{
              inputWrapper: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
              label: "text-[var(--text-muted)]",
              input: "text-[var(--text-primary)]",
            }}
          />

          {error && (
            <div
              className="text-xs px-3 py-2 rounded"
              style={{
                background: "rgba(255,77,77,0.1)",
                border: "1px solid rgba(255,77,77,0.2)",
                color: "var(--accent-red)",
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-mono text-sm font-semibold"
            isLoading={loading}
            style={{
              background: "var(--accent-teal)",
              color: "#090E1A",
            }}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-semibold"
              style={{ color: "var(--accent-teal)" }}
            >
              Register
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div
          className="mt-6 rounded-lg px-4 py-3 text-center"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <span
            className="text-[10px] font-mono uppercase tracking-wider block mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Demo Credentials
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            demo@genomicone.io / demo
          </span>
        </div>
      </div>
    </div>
  );
}
