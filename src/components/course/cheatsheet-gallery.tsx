"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export type Cheatsheet = {
  id: string;
  title: string;
  image: string;
  moduleSlug?: string;
  moduleLabel?: string;
};

type Props = {
  cheatsheets: Cheatsheet[];
};

export function CheatsheetGallery({ cheatsheets }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? cheatsheets[activeIndex] : null;

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight" && activeIndex !== null) {
        setActiveIndex((activeIndex + 1) % cheatsheets.length);
      }
      if (e.key === "ArrowLeft" && activeIndex !== null) {
        setActiveIndex((activeIndex - 1 + cheatsheets.length) % cheatsheets.length);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, activeIndex, cheatsheets.length]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cheatsheets.map((c, i) => (
          <div
            key={c.id}
            className="rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/50"
          >
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              className="block w-full aspect-[4/3] bg-muted overflow-hidden group"
              aria-label={`Open ${c.title} cheatsheet`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={c.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm text-foreground">{c.title}</h3>
                {c.moduleLabel && (
                  <span className="font-mono text-[10px] text-primary font-bold shrink-0">
                    {c.moduleLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  Open ↗
                </button>
                {c.moduleSlug && (
                  <Link
                    href={`/modules/${c.moduleSlug}`}
                    className="text-xs font-mono text-muted-foreground hover:text-primary"
                  >
                    View module →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
          onClick={() => setActiveIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              {active.moduleLabel && (
                <Badge variant="aws" className="text-xs">{active.moduleLabel}</Badge>
              )}
              <h3 className="font-semibold text-sm text-foreground truncate">{active.title}</h3>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {active.moduleSlug && (
                <Link
                  href={`/modules/${active.moduleSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  View module →
                </Link>
              )}
              <a
                href={active.image}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono text-muted-foreground hover:text-primary"
              >
                Full size ↗
              </a>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.image}
              alt={active.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="px-6 py-3 border-t border-border text-center">
            <p className="text-[10px] font-mono text-muted-foreground">
              ← → to navigate · Esc to close · click outside to dismiss
            </p>
          </div>
        </div>
      )}
    </>
  );
}
