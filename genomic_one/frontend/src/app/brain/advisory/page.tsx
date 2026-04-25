"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Chip, Progress, Textarea, Button, Slider, Tooltip } from "@heroui/react";
import { useAuth } from "@/lib/auth-context";

interface Advisor {
  initials: string;
  name: string;
  role: string;
  location: string;
  avatarColor: string;
  opinion: string;
  verdict: string;
  verdictColor: "success" | "warning" | "danger";
  confidence: number;
  timestamp: string;
}

const ADVISORS: Advisor[] = [
  {
    initials: "SC",
    name: "Dr. Sarah Chen",
    role: "Clinical Pharmacologist",
    location: "Copenhagen",
    avatarColor: "#00C9B1",
    opinion:
      "Agree with AI assessment. Standard semaglutide dosing is appropriate for CYP2D6 *1/*4. Recommend monitoring HbA1c at 3-month intervals and adjusting titration if GI adverse effects exceed Grade 2.",
    verdict: "Concur",
    verdictColor: "success",
    confidence: 92,
    timestamp: "2026-03-17 09:15",
  },
  {
    initials: "JO",
    name: "Dr. James Okafor",
    role: "Genetic Counselor",
    location: "Princeton",
    avatarColor: "#3D8EFF",
    opinion:
      "Note that CYP2D6 *1/*4 intermediate metabolizer status may affect co-prescribed medications. Recommend reviewing full medication list before initiating semaglutide. No pharmacogenomic contraindication to GLP-1 RA therapy.",
    verdict: "Concur with caveat",
    verdictColor: "warning",
    confidence: 88,
    timestamp: "2026-03-17 10:30",
  },
  {
    initials: "PS",
    name: "Dr. Priya Sharma",
    role: "Endocrinologist",
    location: "Bangalore",
    avatarColor: "#F0B429",
    opinion:
      "T2D 10yr risk of 38% warrants earlier intervention than age 55. Recommend lifestyle modification program with GLP-1 RA initiation at current age given BMI 28.5 and HbA1c 6.8%. The epigenetic age of 27.9yr suggests favorable biological baseline.",
    verdict: "Modify recommendation",
    verdictColor: "warning",
    confidence: 95,
    timestamp: "2026-03-17 11:45",
  },
];

const CASE_FINDINGS = [
  { label: "Drug", value: "Semaglutide standard dosing" },
  { label: "T2D 10yr Risk", value: "38%" },
  { label: "Epigenetic Age", value: "27.9yr" },
  { label: "BMI", value: "28.5" },
  { label: "HbA1c", value: "6.8%" },
];

const OPINIONS_STORAGE_KEY = "genomic-one-opinions";

const VERDICT_OPTIONS = [
  { key: "Concur", label: "Concur", color: "success" as const },
  { key: "Concur with caveat", label: "Concur with Caveat", color: "warning" as const },
  { key: "Modify recommendation", label: "Modify", color: "warning" as const },
  { key: "Disagree", label: "Disagree", color: "danger" as const },
];

function getStoredOpinions(): Advisor[] {
  try {
    const raw = localStorage.getItem(OPINIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveOpinions(opinions: Advisor[]) {
  try {
    localStorage.setItem(OPINIONS_STORAGE_KEY, JSON.stringify(opinions));
  } catch {
    // ignore
  }
}

function AdvisorCard({ advisor }: { advisor: Advisor }) {
  return (
    <Card
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: 8,
      }}
    >
      <CardBody className="p-5 space-y-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              background: `${advisor.avatarColor}20`,
              color: advisor.avatarColor,
              border: `1.5px solid ${advisor.avatarColor}40`,
            }}
          >
            {advisor.initials}
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {advisor.name}
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {advisor.role}, {advisor.location}
            </div>
          </div>
        </div>

        {/* Opinion */}
        <div
          className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-secondary)",
          }}
        >
          {advisor.opinion}
        </div>

        {/* Verdict chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <Chip
            size="sm"
            variant="flat"
            color={advisor.verdictColor}
            className="text-[10px]"
          >
            {advisor.verdict}
          </Chip>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            Confidence
          </span>
          <Progress
            size="sm"
            value={advisor.confidence}
            maxValue={100}
            classNames={{
              indicator:
                advisor.confidence >= 90
                  ? "bg-green-500"
                  : "bg-amber-500",
              track: "bg-zinc-800",
            }}
            className="max-w-[100px]"
            aria-label={`${advisor.name} confidence`}
          />
          <span
            className="text-[10px] font-mono font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {advisor.confidence}%
          </span>
        </div>

        {/* Timestamp */}
        <div
          className="text-[10px] font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          {advisor.timestamp}
        </div>
      </CardBody>
    </Card>
  );
}

function AddOpinionSection({ onSubmit }: { onSubmit: (opinion: Advisor) => void }) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [verdict, setVerdict] = useState("");
  const [confidence, setConfidence] = useState(80);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!comment || !verdict || !user) return;
    setSubmitting(true);

    const verdictOption = VERDICT_OPTIONS.find((v) => v.key === verdict);
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newOpinion: Advisor = {
      initials: user.initials,
      name: user.name,
      role: user.role,
      location: "Remote",
      avatarColor: user.color,
      opinion: comment,
      verdict: verdict,
      verdictColor: verdictOption?.color || "success",
      confidence,
      timestamp: ts,
    };

    setTimeout(() => {
      onSubmit(newOpinion);
      setComment("");
      setVerdict("");
      setConfidence(80);
      setSubmitting(false);
    }, 300);
  };

  return (
    <div className="mb-6">
      <h2
        className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Add Your Opinion
      </h2>
      <Card
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: 8,
        }}
      >
        <CardBody className="p-5 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: `${user!.color}20`,
                color: user!.color,
                border: `1.5px solid ${user!.color}40`,
              }}
            >
              {user!.initials}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {user!.name}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {user!.role}
              </div>
            </div>
          </div>

          {/* Comment textarea */}
          <Textarea
            label="Your clinical opinion"
            value={comment}
            onValueChange={setComment}
            variant="bordered"
            minRows={3}
            maxRows={6}
            placeholder="Share your assessment of this case..."
            classNames={{
              inputWrapper: "border-[var(--bg-border)] bg-[var(--bg-elevated)] data-[hover=true]:border-[var(--accent-teal)]",
              label: "text-[var(--text-muted)]",
              input: "text-[var(--text-primary)]",
            }}
          />

          {/* Voice input button */}
          <div className="flex items-center gap-3">
            <Tooltip content="Voice input coming soon" placement="top">
              <Button
                isIconOnly
                variant="bordered"
                size="sm"
                className="border-[var(--bg-border)]"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </Button>
            </Tooltip>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              Voice input
            </span>
          </div>

          {/* Verdict selection */}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-wider block mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Verdict
            </span>
            <div className="flex flex-wrap gap-2">
              {VERDICT_OPTIONS.map((v) => (
                <Chip
                  key={v.key}
                  size="sm"
                  variant={verdict === v.key ? "solid" : "bordered"}
                  color={v.color}
                  className="cursor-pointer text-[11px]"
                  onClick={() => setVerdict(v.key)}
                >
                  {v.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Confidence slider */}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-wider block mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Confidence: {confidence}%
            </span>
            <Slider
              size="sm"
              step={1}
              minValue={0}
              maxValue={100}
              value={confidence}
              onChange={(val) => setConfidence(typeof val === "number" ? val : val[0])}
              classNames={{
                track: "bg-zinc-800",
                filler: "bg-[var(--accent-teal)]",
                thumb: "bg-[var(--accent-teal)]",
              }}
              aria-label="Confidence level"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              onPress={handleSubmit}
              isLoading={submitting}
              isDisabled={!comment || !verdict}
              className="font-mono text-xs font-semibold"
              style={{
                background: "var(--accent-teal)",
                color: "#090E1A",
              }}
            >
              Submit Opinion
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function AdvisoryPage() {
  const { isAuthenticated } = useAuth();
  const [userOpinions, setUserOpinions] = useState<Advisor[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUserOpinions(getStoredOpinions());
  }, []);

  const handleNewOpinion = useCallback((opinion: Advisor) => {
    setUserOpinions((prev) => {
      const updated = [opinion, ...prev];
      saveOpinions(updated);
      return updated;
    });
  }, []);

  const allAdvisors = [...userOpinions, ...ADVISORS];
  const concurCount = allAdvisors.filter(
    (a) => a.verdict === "Concur" || a.verdict === "Concur with caveat"
  ).length;
  const modifyCount = allAdvisors.filter(
    (a) => a.verdict === "Modify recommendation"
  ).length;
  const disagreeCount = allAdvisors.filter(
    (a) => a.verdict === "Disagree"
  ).length;
  const total = allAdvisors.length;
  const concurPercent = total > 0 ? Math.round((concurCount / total) * 100) : 0;
  const otherPercent = 100 - concurPercent;

  return (
    <div className="p-6 sm:p-10">
      {/* Header */}
      <span className="panel-label">Advisory</span>
      <h1
        className="text-2xl font-bold tracking-tight mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        Clinical Case Conference
      </h1>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
        Multi-disciplinary review of in silico case studies — AI and human
        intelligence converging on clinical decisions
      </p>
      <div className="mb-8">
        <span
          className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
          style={{ color: "#f59e0b" }}
        >
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Case Under Review */}
      <div className="mb-6">
        <h2
          className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Case Under Review
        </h2>
        <Card
          className="panel-card safla"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <CardBody className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Case ID
                </span>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: "var(--accent-teal)" }}
                >
                  ISC-2026-03-17-001
                </span>
              </div>
              <Chip
                size="sm"
                variant="flat"
                color="warning"
                className="text-[10px] tracking-wider uppercase"
              >
                Under Review
              </Chip>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Patient
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  52yr Male, European
                </span>
              </div>
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Genotype
                </span>
                <span
                  className="text-sm font-mono"
                  style={{ color: "var(--text-primary)" }}
                >
                  CYP2D6 *1/*4 — Intermediate Metabolizer
                </span>
              </div>
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Indication
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  Type 2 Diabetes
                </span>
              </div>
            </div>

            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-wider block mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Key Findings
              </span>
              <div className="flex flex-wrap gap-2">
                {CASE_FINDINGS.map((f) => (
                  <div
                    key={f.label}
                    className="text-xs px-2.5 py-1 rounded"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      {f.label}:{" "}
                    </span>
                    <span className="font-mono">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* AI Recommendation */}
      <div className="mb-6">
        <h2
          className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          AI Recommendation
        </h2>
        <Card
          className="panel-card neural"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <CardBody className="p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                className="text-[10px] tracking-wider uppercase"
              >
                AI Advisory
              </Chip>
            </div>

            <div
              className="rounded-lg px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
              }}
            >
              <p className="mb-2">
                Standard semaglutide dosing is appropriate for CYP2D6 *1/*4
                intermediate metabolizer status. Semaglutide is primarily
                degraded via proteolysis and is not significantly metabolized by
                CYP enzymes, reducing pharmacogenomic interaction risk.
              </p>
              <p className="mb-2">
                Recommend initiation at 0.25mg weekly with standard titration
                schedule. Monitor plasma glucose, HbA1c, and GI tolerability at
                4-week intervals during dose escalation.
              </p>
              <p>
                GLP-1 RA consideration for T2D prevention at age 55 per
                trajectory model, with lifestyle modification commencing
                immediately given 38% 10-year risk.
              </p>
            </div>

            {/* SAFLA validation badge */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--safla-green)" }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 12 15 16 10" />
                  </svg>
                </span>
                <Chip
                  size="sm"
                  variant="flat"
                  color="success"
                  className="text-[10px]"
                >
                  SAFLA Validated
                </Chip>
              </div>
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                ISC-2026-03-17-CYP2D6-001
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  Confidence
                </span>
                <Progress
                  size="sm"
                  value={94.2}
                  maxValue={100}
                  classNames={{
                    indicator: "bg-green-500",
                    track: "bg-zinc-800",
                  }}
                  className="max-w-[100px]"
                  aria-label="AI Confidence"
                />
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  94.2%
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Expert Opinions */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2
            className="font-mono text-xs tracking-[0.15em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Expert Opinions
          </h2>
          <Chip
            size="sm"
            variant="flat"
            color="secondary"
            className="text-[10px] tracking-wider uppercase"
          >
            {allAdvisors.length} Advisors
          </Chip>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {allAdvisors.map((advisor, i) => (
            <AdvisorCard key={`${advisor.initials}-${i}`} advisor={advisor} />
          ))}
        </div>
      </div>

      {/* Consensus Panel */}
      <div className="mb-6">
        <h2
          className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Consensus Panel
        </h2>
        <Card
          className="panel-card genomic"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
          }}
        >
          <CardBody className="p-5 space-y-5">
            {/* Consensus indicator */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Consensus
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {concurCount}/{total} Concur
                  {modifyCount > 0 && <>, {modifyCount}/{total} Modify</>}
                  {disagreeCount > 0 && <>, {disagreeCount}/{total} Disagree</>}
                </span>
              </div>
              <Chip
                size="sm"
                variant="flat"
                color="success"
                className="text-[10px] tracking-wider uppercase"
              >
                Advisory Complete
              </Chip>
            </div>

            {/* Visual alignment bar */}
            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-wider block mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Alignment
              </span>
              <div
                className="w-full h-3 rounded-full overflow-hidden flex"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div
                  className="h-full rounded-l-full"
                  style={{
                    width: `${concurPercent}%`,
                    background: "#22c55e",
                  }}
                />
                <div
                  className="h-full rounded-r-full"
                  style={{
                    width: `${otherPercent}%`,
                    background: "#f59e0b",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#22c55e" }}
                >
                  {concurPercent}% Concur
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#f59e0b" }}
                >
                  {otherPercent}% Other
                </span>
              </div>
            </div>

            {/* AI-Human alignment */}
            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                AI-Human Alignment
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                High — AI recommendation supported by majority
              </span>
            </div>

            {/* Final advisory */}
            <div
              className="rounded-lg px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
              }}
            >
              <span
                className="block text-[10px] uppercase tracking-wider font-mono mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Final Advisory
              </span>
              Proceed with semaglutide initiation. Incorporate Dr.
              Sharma&apos;s recommendation for earlier GLP-1 RA start. Review
              co-medications per Dr. Okafor&apos;s note.
            </div>

            {/* SAFLA re-validation */}
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: "var(--safla-green)" }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 12 15 16 10" />
                </svg>
              </span>
              <Chip
                size="sm"
                variant="flat"
                color="success"
                className="text-[10px]"
              >
                SAFLA Re-Validated
              </Chip>
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                Passed with expert consensus
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Add Your Opinion — only when authenticated */}
      {mounted && isAuthenticated && (
        <AddOpinionSection onSubmit={handleNewOpinion} />
      )}

      {/* Footer */}
      <div className="text-center mt-8">
        <span
          className="text-[10px] font-mono uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Simulated Data &middot; In Silico Environment
        </span>
      </div>
    </div>
  );
}
