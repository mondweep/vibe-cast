"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LearnerPersonaSelector } from "@/components/course/LearnerPersonaSelector";
import { Button } from "@/components/ui/button";
import { PersonaType } from "@/types";
import { useProgress } from "@/contexts/ProgressContext";

export default function LearnPage() {
  const [selected, setSelected] = useState<PersonaType | undefined>();
  const { setPersona } = useProgress();
  const router = useRouter();

  function handleStart() {
    if (!selected) return;
    setPersona(selected);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <p className="text-xs text-primary font-mono font-bold uppercase tracking-widest mb-3">AWS Advanced Networking</p>
          <h1 className="text-3xl font-bold text-foreground mb-3">Who are you learning as?</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your persona shapes the module order, content depth, and resources shown throughout the course.
          </p>
        </div>
        <LearnerPersonaSelector selected={selected} onSelect={setSelected} />
        {selected && (
          <div className="mt-8 flex justify-center">
            <Button onClick={handleStart} size="lg" className="font-mono px-10">
              Start as {selected} →
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
