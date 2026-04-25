"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, Button, Select, SelectItem } from "@heroui/react";
import { useAuth } from "@/lib/auth-context";

const ROLES = [
  "Research Scientist",
  "Clinical Pharmacologist",
  "Genetic Counselor",
  "Endocrinologist",
  "Platform Admin",
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !role) {
      setError("All fields are required");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = register(name, email, password, role);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Registration failed");
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
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onValueChange={setName}
            variant="bordered"
            isRequired
            classNames={{
              inputWrapper: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
              label: "text-[var(--text-muted)]",
              input: "text-[var(--text-primary)]",
            }}
          />
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
          <Select
            label="Role"
            variant="bordered"
            isRequired
            selectedKeys={role ? [role] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              if (selected) setRole(String(selected));
            }}
            classNames={{
              trigger: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
              label: "text-[var(--text-muted)]",
              value: "text-[var(--text-primary)]",
            }}
          >
            {ROLES.map((r) => (
              <SelectItem key={r}>{r}</SelectItem>
            ))}
          </Select>

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
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold"
              style={{ color: "var(--accent-teal)" }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
