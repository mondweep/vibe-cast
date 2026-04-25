"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Card,
  CardBody,
  Select,
  SelectItem,
  Input,
  Button,
  Chip,
  Progress,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Constants ----------

const CYP2D6_ALLELES = ["*1", "*2", "*3", "*4", "*5", "*6", "*10", "*17", "*41"];
const ETHNICITIES = ["European", "East Asian", "African", "South Asian", "Hispanic"];
const HBB_OPTIONS = ["Normal", "Sickle Cell Carrier", "Sickle Cell Disease"];
const BRCA1_OPTIONS = ["Normal", "185delAG Carrier", "5382insC Carrier"];
const INDICATIONS = ["Type 2 Diabetes", "Obesity", "Pain Management", "Oncology Screening"];

const STEP_LABELS = [
  "Patient Profile",
  "Genotype",
  "Clinical History",
  "Indication",
  "Results",
];

const ACTIVITY_SCORES: Record<string, number> = {
  "*1": 1.0,
  "*2": 1.0,
  "*3": 0.0,
  "*4": 0.0,
  "*5": 0.0,
  "*6": 0.0,
  "*10": 0.5,
  "*17": 0.5,
  "*41": 0.5,
};

const ETHNICITY_CONFIDENCE: Record<string, number> = {
  European: 0.96,
  "East Asian": 0.78,
  African: 0.74,
  "South Asian": 0.81,
  Hispanic: 0.83,
};

// ---------- Simulation Logic ----------

function getActivityScore(allele: string): number {
  return ACTIVITY_SCORES[allele] ?? 1.0;
}

function getPhenotype(totalActivity: number): string {
  if (totalActivity === 0) return "Poor";
  if (totalActivity <= 0.5) return "Intermediate";
  if (totalActivity <= 1.5) return "Normal";
  return "Ultrarapid";
}

type RiskLevel = "low" | "monitor" | "action";
const RISK_CONFIG: Record<RiskLevel, { label: string; color: "success" | "warning" | "danger" }> = {
  low: { label: "Low Risk", color: "success" },
  monitor: { label: "Monitor", color: "warning" },
  action: { label: "Action Required", color: "danger" },
};

interface DrugRec {
  drug: string;
  recommendation: string;
  doseFactor: number;
  risk: RiskLevel;
}

function getDrugRecommendations(indication: string, phenotype: string): DrugRec[] {
  if (indication === "Type 2 Diabetes" || indication === "Obesity") {
    const risk: RiskLevel = phenotype === "Poor" ? "monitor" : "low";
    return [
      {
        drug: "Semaglutide (GLP-1 RA)",
        recommendation:
          phenotype === "Poor"
            ? "CYP2D6 poor metabolizer. GLP-1 RAs have minimal CYP2D6 involvement; standard dosing appropriate with enhanced monitoring for GI side effects."
            : phenotype === "Intermediate"
              ? "CYP2D6 intermediate metabolizer. Standard semaglutide dosing recommended. Monitor glycemic response at titration."
              : "Normal CYP2D6 metabolism. Standard semaglutide dosing per label. Titrate 0.25 mg weekly x4, then 0.5 mg.",
        doseFactor: 1.0,
        risk,
      },
      {
        drug: "Metformin",
        recommendation: "Non-CYP metabolized. No pharmacogenomic adjustment required. Standard first-line T2D therapy.",
        doseFactor: 1.0,
        risk: "low",
      },
    ];
  }

  if (indication === "Pain Management") {
    const codeineRisk: RiskLevel =
      phenotype === "Poor" ? "action" : phenotype === "Intermediate" ? "monitor" : phenotype === "Ultrarapid" ? "action" : "low";
    const codeineDose = phenotype === "Poor" ? 0.0 : phenotype === "Intermediate" ? 0.5 : phenotype === "Ultrarapid" ? 0.0 : 1.0;
    return [
      {
        drug: "Codeine",
        recommendation:
          phenotype === "Poor"
            ? "AVOID codeine. CYP2D6 poor metabolizer cannot convert codeine to morphine. Use alternative analgesic (e.g., morphine, oxycodone)."
            : phenotype === "Intermediate"
              ? "Reduced codeine efficacy expected. Consider 50% dose reduction or alternative analgesic. Monitor pain control."
              : phenotype === "Ultrarapid"
                ? "AVOID codeine. Ultrarapid metabolism may cause morphine toxicity. Use non-prodrug opioid with careful titration."
                : "Standard codeine dosing appropriate. Monitor for efficacy and adverse effects.",
        doseFactor: codeineDose,
        risk: codeineRisk,
      },
      {
        drug: "Tramadol",
        recommendation:
          phenotype === "Poor"
            ? "Reduced efficacy expected. Consider alternative analgesic — tramadol activation impaired."
            : phenotype === "Ultrarapid"
              ? "Risk of respiratory depression. Avoid or use with extreme caution."
              : "Standard tramadol dosing. Monitor for efficacy.",
        doseFactor: phenotype === "Poor" ? 0.0 : phenotype === "Intermediate" ? 0.7 : 1.0,
        risk: phenotype === "Poor" || phenotype === "Ultrarapid" ? "action" : phenotype === "Intermediate" ? "monitor" : "low",
      },
    ];
  }

  if (indication === "Oncology Screening") {
    const tamoxRisk: RiskLevel =
      phenotype === "Poor" ? "action" : phenotype === "Intermediate" ? "monitor" : "low";
    return [
      {
        drug: "Tamoxifen",
        recommendation:
          phenotype === "Poor"
            ? "CYP2D6 poor metabolizer. Severely impaired conversion to endoxifen. Consider aromatase inhibitor (e.g., letrozole) as alternative."
            : phenotype === "Intermediate"
              ? "Reduced endoxifen levels expected. Consider higher tamoxifen dose (40 mg) or switch to aromatase inhibitor."
              : "Standard tamoxifen dosing (20 mg daily). Adequate CYP2D6 activity for endoxifen conversion.",
        doseFactor: phenotype === "Poor" ? 0.0 : phenotype === "Intermediate" ? 0.6 : 1.0,
        risk: tamoxRisk,
      },
    ];
  }

  return [];
}

function getTrajectoryNote(
  age: number,
  indication: string,
  phenotype: string,
  brca1: string,
  hbb: string,
  diplotype: string,
): string {
  const baseRisk = Math.round(5 + (age - 30) * 0.82 + (phenotype === "Poor" ? 8 : phenotype === "Intermediate" ? 4 : 0));

  if (indication === "Type 2 Diabetes" || indication === "Obesity") {
    const risk = Math.min(baseRisk + 12, 85);
    return `Based on age ${age}, CYP2D6 ${diplotype}, ${indication} indication: 10-year T2D progression risk ${risk}%. ${risk > 30 ? "GLP-1 RA initiation recommended." : "Lifestyle intervention and monitoring recommended."} ${hbb === "Sickle Cell Disease" ? "HbA1c may be unreliable due to HBB status — consider fructosamine monitoring." : ""}`.trim();
  }

  if (indication === "Pain Management") {
    return `Based on age ${age}, CYP2D6 ${diplotype}: ${phenotype} metabolizer status impacts opioid prodrug activation. ${phenotype === "Poor" || phenotype === "Ultrarapid" ? "Alternative analgesic pathways strongly recommended." : "Standard pharmacotherapy with monitoring."} ${age > 65 ? "Age-related hepatic clearance decline — consider dose reduction." : ""}`.trim();
  }

  if (indication === "Oncology Screening") {
    const brca1Risk = brca1 === "185delAG Carrier" ? 55 + Math.round((age - 30) * 0.6) : brca1 === "5382insC Carrier" ? 48 + Math.round((age - 30) * 0.5) : 12 + Math.round((age - 30) * 0.15);
    return `Based on age ${age}, ${brca1 !== "Normal" ? `BRCA1 ${brca1}` : "BRCA1 normal"}: lifetime breast cancer risk ~${Math.min(brca1Risk, 87)}%. ${brca1 !== "Normal" ? "Enhanced screening protocol recommended (annual MRI + mammography)." : "Standard screening per age-appropriate guidelines."} CYP2D6 ${diplotype} ${phenotype === "Poor" ? "limits tamoxifen efficacy — aromatase inhibitor preferred." : "is compatible with tamoxifen therapy."}`.trim();
  }

  return `Patient age ${age}, CYP2D6 ${diplotype} (${phenotype} Metabolizer). Review clinical context for personalized recommendation.`;
}

function generateAuditId(allele1: string, allele2: string, indication: string): string {
  const indicationCode = indication.split(" ").map((w) => w[0]).join("").toUpperCase();
  const hash = Math.abs(
    (allele1 + allele2 + indication).split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 17 % 9999
  );
  return `SIM-2026-${indicationCode}-${String(hash).padStart(4, "0")}`;
}

// ---------- Types ----------

interface SimulationResult {
  diplotype: string;
  allele1: string;
  allele2: string;
  activity1: number;
  activity2: number;
  totalActivity: number;
  phenotype: string;
  drugs: DrugRec[];
  trajectoryNote: string;
  auditId: string;
  confidence: number;
  ethnicity: string;
  age: number;
  indication: string;
  brca1: string;
  hbb: string;
}

// ---------- Sub-components ----------

function SelectionCard({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left px-5 py-4 rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        background: selected ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: selected ? "2px solid var(--accent-teal)" : "2px solid var(--bg-border)",
        color: selected ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {selected && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </button>
  );
}

function StepProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="w-full mb-10">
      {/* Step dots and labels */}
      <div className="flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, i) => {
          const isActive = i === currentStep;
          const isComplete = i < currentStep;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: isActive
                    ? "var(--accent-teal)"
                    : isComplete
                      ? "var(--accent-teal)"
                      : "var(--bg-elevated)",
                  color: isActive || isComplete ? "var(--bg-base)" : "var(--text-muted)",
                  opacity: isActive || isComplete ? 1 : 0.5,
                }}
              >
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-[10px] font-medium hidden sm:block transition-colors duration-300"
                style={{
                  color: isActive ? "var(--accent-teal)" : isComplete ? "var(--text-secondary)" : "var(--text-muted)",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress track */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--accent-teal)" }}
          initial={false}
          animate={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

// ---------- Slide transition variants ----------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ---------- Main Component ----------

export default function SimulatePage() {
  // Wizard step
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Form state
  const [age, setAge] = useState(52);
  const [sex, setSex] = useState("Male");
  const [ethnicity, setEthnicity] = useState("European");
  const [allele1, setAllele1] = useState("*1");
  const [allele2, setAllele2] = useState("*4");
  const [hbb, setHbb] = useState("Normal");
  const [brca1, setBrca1] = useState("Normal");
  const [bmi, setBmi] = useState(28.5);
  const [hba1c, setHba1c] = useState(6.8);
  const [indication, setIndication] = useState("Type 2 Diabetes");

  // Result state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const totalSteps = 5;

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      // If going back from results, clear them
      if (step === 4) {
        setResult(null);
        setAnalyzing(false);
      }
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const runSimulation = useCallback(() => {
    setDirection(1);
    setStep(4);
    setAnalyzing(true);

    setTimeout(() => {
      const a1 = allele1;
      const a2 = allele2;
      const act1 = getActivityScore(a1);
      const act2 = getActivityScore(a2);
      const total = act1 + act2;
      const phenotype = getPhenotype(total);
      const diplotype = `${a1}/${a2}`;
      const drugs = getDrugRecommendations(indication, phenotype);
      const trajectoryNote = getTrajectoryNote(age, indication, phenotype, brca1, hbb, diplotype);
      const auditId = generateAuditId(a1, a2, indication);
      const confidence = ETHNICITY_CONFIDENCE[ethnicity] ?? 0.85;

      setResult({
        diplotype,
        allele1: a1,
        allele2: a2,
        activity1: act1,
        activity2: act2,
        totalActivity: total,
        phenotype,
        drugs,
        trajectoryNote,
        auditId,
        confidence,
        ethnicity,
        age,
        indication,
        brca1,
        hbb,
      });
      setAnalyzing(false);
    }, 1500);
  }, [allele1, allele2, indication, age, brca1, hbb, ethnicity]);

  // Keyboard: Enter to advance, Escape to go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && step < 3) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Enter" && step === 3) {
        e.preventDefault();
        runSimulation();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, goNext, runSimulation]);

  const phenotypeColor = useMemo(() => {
    if (!result) return "default" as const;
    switch (result.phenotype) {
      case "Poor":
        return "danger" as const;
      case "Intermediate":
        return "warning" as const;
      case "Ultrarapid":
        return "primary" as const;
      default:
        return "success" as const;
    }
  }, [result]);

  const reasoningSteps = useMemo(() => {
    if (!result) return [];
    const warnings: string[] = [];
    if (result.confidence < 0.85) warnings.push(`Population coverage limited for ${result.ethnicity} cohort`);
    if (result.hbb === "Sickle Cell Disease") warnings.push("HbA1c reliability flag for HBB status");
    if (result.drugs.some((d) => d.risk === "action")) warnings.push("High-risk drug interaction detected");

    return [
      { step: 1, label: "Genotype Input", detail: `CYP2D6 ${result.diplotype}` },
      { step: 2, label: "Star Allele Mapping", detail: `Activity Score: ${result.activity1.toFixed(1)} + ${result.activity2.toFixed(1)} = ${result.totalActivity.toFixed(1)}` },
      { step: 3, label: "Phenotype Classification", detail: `${result.phenotype} Metabolizer` },
      { step: 4, label: "Clinical Decision", detail: `${result.indication} + ${result.phenotype} Metabolizer → ${result.drugs.length} drug recommendation(s)` },
      { step: 5, label: "SAFLA Validation", detail: warnings.length > 0 ? `Passed with ${warnings.length} warning(s): ${warnings.join("; ")}` : "Passed — all checks nominal" },
    ];
  }, [result]);

  // ---------- Step renderers ----------

  const renderStep0 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Tell us about your patient
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Basic demographics to contextualize the pharmacogenomic analysis.
        </p>
      </div>

      {/* Age */}
      <div className="flex flex-col items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Age
        </label>
        <Input
          type="number"
          value={String(age)}
          onValueChange={(v) => setAge(Number(v) || 0)}
          size="lg"
          classNames={{
            inputWrapper: "bg-surface-2 border-border max-w-[160px] h-16",
            input: "text-center text-3xl font-bold font-mono",
          }}
        />
      </div>

      {/* Sex */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
          Sex
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <SelectionCard label="Male" selected={sex === "Male"} onSelect={() => setSex("Male")} />
          <SelectionCard label="Female" selected={sex === "Female"} onSelect={() => setSex("Female")} />
        </div>
      </div>

      {/* Ethnicity */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
          Ethnicity
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ETHNICITIES.map((e) => (
            <SelectionCard key={e} label={e} selected={ethnicity === e} onSelect={() => setEthnicity(e)} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {"What's the genotype?"}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Select the CYP2D6 star alleles for this patient.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
            CYP2D6 Allele 1
          </label>
          <Select
            label="Allele 1"
            selectedKeys={new Set([allele1])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              if (val) setAllele1(val);
            }}
            size="lg"
            classNames={{ trigger: "bg-surface-2 border-border h-14 text-lg" }}
          >
            {CYP2D6_ALLELES.map((a) => (
              <SelectItem key={a}>{a}</SelectItem>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
            CYP2D6 Allele 2
          </label>
          <Select
            label="Allele 2"
            selectedKeys={new Set([allele2])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string;
              if (val) setAllele2(val);
            }}
            size="lg"
            classNames={{ trigger: "bg-surface-2 border-border h-14 text-lg" }}
          >
            {CYP2D6_ALLELES.map((a) => (
              <SelectItem key={a}>{a}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Preview of activity scores */}
      <div
        className="rounded-xl px-5 py-4 max-w-lg"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Activity Score Preview
        </div>
        <div className="mt-2 font-mono text-sm" style={{ color: "var(--text-primary)" }}>
          {allele1} ({getActivityScore(allele1).toFixed(1)}) + {allele2} ({getActivityScore(allele2).toFixed(1)}) ={" "}
          <span style={{ color: "var(--accent-teal)" }} className="font-bold">
            {(getActivityScore(allele1) + getActivityScore(allele2)).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Clinical context
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Relevant genetic conditions that may affect clinical decisions.
        </p>
      </div>

      {/* HBB Status */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
          HBB Status
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          {HBB_OPTIONS.map((option) => (
            <SelectionCard key={option} label={option} selected={hbb === option} onSelect={() => setHbb(option)} />
          ))}
        </div>
      </div>

      {/* BRCA1 Status */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
          BRCA1 Status
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          {BRCA1_OPTIONS.map((option) => (
            <SelectionCard key={option} label={option} selected={brca1 === option} onSelect={() => setBrca1(option)} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          What are we investigating?
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Clinical measurements and primary indication for this case study.
        </p>
      </div>

      {/* BMI and HbA1c */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
            BMI
          </label>
          <Input
            type="number"
            value={String(bmi)}
            onValueChange={(v) => setBmi(Number(v) || 0)}
            size="lg"
            classNames={{
              inputWrapper: "bg-surface-2 border-border h-14",
              input: "text-lg font-mono",
            }}
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
            HbA1c (%)
          </label>
          <Input
            type="number"
            value={String(hba1c)}
            onValueChange={(v) => setHba1c(Number(v) || 0)}
            size="lg"
            classNames={{
              inputWrapper: "bg-surface-2 border-border h-14",
              input: "text-lg font-mono",
            }}
          />
        </div>
      </div>

      {/* Primary Indication */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wider block mb-3" style={{ color: "var(--text-muted)" }}>
          Primary Indication
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {INDICATIONS.map((ind) => (
            <SelectionCard key={ind} label={ind} selected={indication === ind} onSelect={() => setIndication(ind)} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        className="w-12 h-12 rounded-full"
        style={{
          border: "3px solid var(--bg-border)",
          borderTopColor: "var(--accent-teal)",
        }}
      />
      <div className="text-center">
        <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Analyzing...
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Running pharmacogenomic simulation
        </p>
      </div>
    </div>
  );

  const renderStep4 = () => {
    if (analyzing) return renderAnalyzing();
    if (!result) return renderAnalyzing();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            In Silico Case Study Results
          </h2>
          <div className="mt-2">
            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded" style={{ color: "#f59e0b" }}>
              Simulated Data -- In Silico Environment
            </span>
          </div>
        </div>

        {/* Section divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "var(--bg-border)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>SIMULATION RESULTS</span>
          <div className="h-px flex-1" style={{ background: "var(--bg-border)" }} />
        </div>

        {/* Metabolizer Classification */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-surface border border-border">
            <CardBody className="gap-4">
              <h3 className="text-sm font-semibold text-zinc-300">Metabolizer Classification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-zinc-400">CYP2D6 Diplotype</div>
                  <div className="text-2xl font-mono font-bold mt-1">{result.diplotype}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <span>Allele 1: <span className="font-mono text-zinc-300">{result.allele1} ({result.activity1.toFixed(1)})</span></span>
                    <span className="text-zinc-400">|</span>
                    <span>Allele 2: <span className="font-mono text-zinc-300">{result.allele2} ({result.activity2.toFixed(1)})</span></span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Phenotype</div>
                  <div className="mt-1">
                    <Chip color={phenotypeColor} variant="flat" size="lg">
                      {result.phenotype} Metabolizer
                    </Chip>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Activity Score</div>
                  <div className="text-2xl font-mono font-bold mt-1">{result.totalActivity.toFixed(1)}</div>
                  <Progress
                    value={result.totalActivity * 50}
                    maxValue={100}
                    size="sm"
                    classNames={{
                      indicator:
                        result.totalActivity === 0
                          ? "bg-red-500"
                          : result.totalActivity <= 0.5
                            ? "bg-amber-500"
                            : result.totalActivity <= 1.5
                              ? "bg-green-500"
                              : "bg-blue-500",
                      track: "bg-zinc-800",
                    }}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Drug Recommendations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-surface border border-border">
            <CardBody className="gap-4">
              <h3 className="text-sm font-semibold text-zinc-300">Drug Recommendations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-zinc-400 text-xs">
                      <th className="text-left py-2 px-3 font-medium">Risk</th>
                      <th className="text-left py-2 px-3 font-medium">Drug</th>
                      <th className="text-left py-2 px-3 font-medium">Clinical Recommendation</th>
                      <th className="text-left py-2 px-3 font-medium">Dose Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.drugs.map((drug, i) => {
                      const cfg = RISK_CONFIG[drug.risk];
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-3 px-3">
                            <Chip size="sm" variant="flat" color={cfg.color} className="min-w-[80px] text-center">
                              {cfg.label}
                            </Chip>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-semibold">{drug.drug}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-300 max-w-md text-xs">
                            {drug.recommendation}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.max(drug.doseFactor * 80, 10)}px`,
                                  backgroundColor:
                                    drug.risk === "action"
                                      ? "#f43f5e"
                                      : drug.risk === "monitor"
                                        ? "#f59e0b"
                                        : "#10b981",
                                }}
                              />
                              <span className="font-mono text-xs">{drug.doseFactor}x</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Disease Trajectory Preview */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-surface border border-border">
            <CardBody className="gap-3">
              <h3 className="text-sm font-semibold text-zinc-300">Disease Trajectory Preview</h3>
              <div className="bg-zinc-800/30 border border-border rounded-lg px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {result.trajectoryNote}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* SAFLA Validation Badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-surface border border-border">
            <CardBody className="gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 12 15 16 10" />
                    </svg>
                  </span>
                  <span className="font-semibold text-sm">SAFLA Validated</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={result.confidence >= 0.85 ? "success" : "warning"}
                  >
                    {result.confidence >= 0.85 ? "PASSED" : "PASSED WITH WARNINGS"}
                  </Chip>
                </div>
                <span className="text-[10px] text-zinc-400">Powered by SAFLA</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-zinc-400">Audit ID</span>
                  <div className="font-mono mt-0.5">{result.auditId}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Confidence</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Progress
                      value={result.confidence * 100}
                      maxValue={100}
                      size="sm"
                      classNames={{
                        indicator: result.confidence >= 0.85 ? "bg-green-500" : "bg-amber-500",
                        track: "bg-zinc-800",
                      }}
                      className="max-w-[100px]"
                    />
                    <span className="font-mono">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400">Population</span>
                  <div className="mt-0.5">
                    {result.ethnicity}
                    {result.confidence < 0.85 && (
                      <span className="ml-2 text-amber-400 text-[10px]">
                        (underrepresented in training data)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Computational Reasoning Chain */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Accordion variant="bordered" className="border-border">
            <AccordionItem
              key="reasoning"
              aria-label="Computational Reasoning Chain — In Silico"
              title={
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-300">Computational Reasoning Chain — In Silico</span>
                  <Chip size="sm" variant="flat" color="secondary">
                    5-layer intelligence pipeline
                  </Chip>
                </div>
              }
            >
              <div className="space-y-3 pb-2">
                {reasoningSteps.map((rs) => (
                  <div key={rs.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {rs.step}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-300">{rs.label}</div>
                      <div className="text-xs text-zinc-400">{rs.detail}</div>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] text-zinc-400 mt-2 pt-2 border-t border-border">
                  Full reasoning chain — 5-layer intelligence pipeline
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* In Silico label */}
        <div className="text-center">
          <span className="text-[10px] text-zinc-400">
            Simulated Data -- In Silico Environment
          </span>
        </div>
      </motion.div>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6v2H9zM12 5v3M5.5 8h13l-1.5 13H7z" />
            <circle cx="10" cy="14" r="1" />
            <circle cx="14" cy="14" r="1" />
            <line x1="10" y1="17" x2="14" y2="17" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Case Simulation</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>In Silico Clinical Decision Support</p>
        </div>
      </div>

      <div className="mt-1 mb-6">
        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded" style={{ color: "#f59e0b" }}>
          Simulated Data -- In Silico Environment
        </span>
      </div>

      {/* Progress indicator */}
      <StepProgressBar currentStep={step} totalSteps={totalSteps} />

      {/* Wizard content with slide transitions */}
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {stepRenderers[step]()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid var(--bg-border)" }}>
        <div>
          {step > 0 && step < 4 && (
            <Button
              variant="bordered"
              size="lg"
              onPress={goBack}
              className="font-semibold px-6"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="bordered"
              size="lg"
              onPress={goBack}
              className="font-semibold px-6"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Edit Inputs
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {step < 3 && (
            <>
              <span className="text-[10px] hidden sm:inline" style={{ color: "var(--text-muted)" }}>
                Press Enter to continue
              </span>
              <Button
                color="primary"
                size="lg"
                onPress={goNext}
                className="font-semibold px-8"
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </>
          )}
          {step === 3 && (
            <Button
              color="primary"
              size="lg"
              onPress={runSimulation}
              className="font-semibold px-8"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Simulation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
