"use client";
import { useState } from "react";
import { CourseLayout } from "@/components/layout/CourseLayout";
import { VpcBuilder } from "@/components/labs/VpcBuilder";
import { BgpSimulator } from "@/components/labs/BgpSimulator";
import { ScenarioExercise } from "@/components/labs/ScenarioExercise";
import { cn } from "@/lib/utils";

const LABS = [
  { id: "vpc", label: "VPC Builder", icon: "⬡", desc: "Design and validate a VPC architecture interactively", module: "M01" },
  { id: "bgp", label: "BGP Simulator", icon: "↔", desc: "Adjust BGP attributes and predict path selection", module: "M02/M10" },
  { id: "scenario", label: "Scenario Exercises", icon: "◈", desc: "Real-world architecture decision practice", module: "All" },
];

export default function LabsPage() {
  const [active, setActive] = useState("vpc");

  return (
    <CourseLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Interactive Labs</h1>
          <p className="text-muted-foreground text-sm mt-1">Hands-on exercises to build real-world AWS networking confidence</p>
        </div>

        {/* Lab tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {LABS.map(lab => (
            <button key={lab.id} onClick={() => setActive(lab.id)}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all",
                active === lab.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
              <span>{lab.icon}</span>
              <span className="font-medium">{lab.label}</span>
              <span className="text-[10px] font-mono opacity-60">{lab.module}</span>
            </button>
          ))}
        </div>

        {/* Lab content */}
        <div className="rounded-lg border border-border bg-card p-6">
          {active === "vpc" && <VpcBuilder />}
          {active === "bgp" && <BgpSimulator />}
          {active === "scenario" && <ScenarioExercise />}
        </div>
      </div>
    </CourseLayout>
  );
}
