"use client";
import { useState } from "react";
import Link from "next/link";
import { LearnerPersonaSelector } from "@/components/course/LearnerPersonaSelector";
import { Button } from "@/components/ui/button";
import { PersonaType } from "@/types";

export default function LearnPage() {
  const [persona, setPersona] = useState<PersonaType | undefined>();

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="text-xs text-muted-foreground font-mono hover:text-primary mb-6 block">← Home</Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">Who are you learning as?</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Your selection personalises the learning path, content depth, and supplementary resources.
      </p>
      <LearnerPersonaSelector selected={persona} onSelect={setPersona} />
      {persona && (
        <div className="mt-8 flex justify-end">
          <Link href={`/dashboard?persona=${persona}`}>
            <Button className="font-mono">Continue as {persona} →</Button>
          </Link>
        </div>
      )}
    </main>
  );
}
