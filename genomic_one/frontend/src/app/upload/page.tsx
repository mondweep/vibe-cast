"use client";

import { useCallback, useRef, useState } from "react";
import { analyzeSequence, type AnalyzeError, type AnalyzeResult } from "@/lib/api";

const SAMPLE_HBB =
  "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTC";

const SAMPLE_HBB_SICKLE =
  "ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTC";

function formatErrorMessage(err: AnalyzeError): string {
  switch (err.error) {
    case "empty_input":
      return "Input is empty.";
    case "invalid_alphabet":
      return `Invalid character "${err.character}" at position ${err.position}. Only A C G T N are allowed.`;
    case "too_short":
      return `Sequence too short (${err.length} bp). Minimum is ${err.min} bp.`;
    case "too_long":
      return `Sequence too long (${err.length} bp). Maximum is ${err.max} bp.`;
    case "no_bases":
      return "No DNA bases found in input.";
    case "internal_error":
      return `Internal server error: ${err.detail ?? "unknown"}`;
    default:
      return err.error;
  }
}

export default function UploadPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [coldStartHint, setColdStartHint] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = useCallback(async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setColdStartHint(false);

    const hintTimer = setTimeout(() => setColdStartHint(true), 4000);
    try {
      const r = await analyzeSequence(text);
      setResult(r);
    } catch (err) {
      const e = err as AnalyzeError | Error;
      if (typeof (e as AnalyzeError).error === "string") {
        setError(formatErrorMessage(e as AnalyzeError));
      } else {
        const msg = (e as Error).name === "TimeoutError"
          ? "Backend timed out. Render free tier may be cold-starting — try again in 30 seconds."
          : `Network error: ${(e as Error).message}`;
        setError(msg);
      }
    } finally {
      clearTimeout(hintTimer);
      setLoading(false);
      setColdStartHint(false);
    }
  }, [text, loading]);

  const onFile = useCallback(async (file: File) => {
    if (file.size > 100 * 1024) {
      setError(`File too large (${(file.size / 1024).toFixed(1)} KB). Maximum is 100 KB.`);
      return;
    }
    const t = await file.text();
    setText(t);
    setError(null);
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Analyze DNA Sequence
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Upload or paste a FASTA / plain-bases DNA sequence. Runs the full pipeline against the
          reference panel (HBB, TP53, BRCA1, CYP2D6, INS, APOE) and returns alignment, k-mer
          similarity, alignment-based variant diff, protein translation, and pharmacogenomics if
          CYP2D6 is the best match.
        </p>
      </header>

      <div
        className="rounded-lg p-3 text-xs font-mono"
        style={{
          background: "rgba(240,180,41,0.08)",
          border: "1px solid rgba(240,180,41,0.4)",
          color: "var(--accent-gold)",
        }}
      >
        Research/educational use only. Outputs are illustrative — not for clinical diagnosis.
      </div>

      {/* Input area */}
      <section className="panel-card genomic space-y-3">
        <span className="panel-label">Input Sequence</span>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="rounded-lg border-2 border-dashed p-6 text-center transition-colors"
          style={{
            borderColor: dragOver ? "var(--accent-teal)" : "var(--bg-border)",
            background: dragOver ? "rgba(0,201,177,0.05)" : "transparent",
          }}
        >
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            Drop a FASTA file here, or
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.fna,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-1.5 rounded font-mono"
            style={{
              background: "rgba(0,201,177,0.1)",
              color: "var(--accent-teal)",
            }}
          >
            Browse files
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or paste FASTA / DNA bases (A C G T N)..."
          rows={8}
          className="w-full rounded-lg p-3 font-mono text-xs resize-y"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-primary)",
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setText(SAMPLE_HBB);
              setError(null);
              setResult(null);
            }}
            className="text-xs px-3 py-1.5 rounded font-mono"
            style={{
              background: "rgba(122,156,199,0.1)",
              color: "var(--text-secondary)",
            }}
          >
            Load HBB reference
          </button>
          <button
            onClick={() => {
              setText(SAMPLE_HBB_SICKLE);
              setError(null);
              setResult(null);
            }}
            className="text-xs px-3 py-1.5 rounded font-mono"
            style={{
              background: "rgba(255,79,121,0.1)",
              color: "#ff6b85",
            }}
          >
            Load HBB with HbS variant
          </button>
          <span className="text-xs ml-auto font-mono" style={{ color: "var(--text-muted)" }}>
            {text.length.toLocaleString()} chars
          </span>
          <button
            onClick={onSubmit}
            disabled={loading || !text.trim()}
            className="text-sm px-5 py-2 rounded-full font-semibold font-mono disabled:opacity-50"
            style={{ background: "var(--accent-teal)", color: "#090E1A" }}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {coldStartHint && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Backend may be cold-starting (Render free tier). First request can take ~15 seconds.
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <section
          className="rounded-lg p-4"
          style={{
            background: "rgba(255,79,121,0.08)",
            border: "1px solid rgba(255,79,121,0.4)",
            color: "#ff6b85",
          }}
        >
          <div className="font-semibold text-sm mb-1">Analysis failed</div>
          <div className="text-xs">{error}</div>
        </section>
      )}

      {/* Results */}
      {result && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: AnalyzeResult }) {
  return (
    <div className="space-y-6">
      {result.warnings.length > 0 && (
        <section
          className="rounded-lg p-3 text-xs font-mono space-y-1"
          style={{
            background: "rgba(240,180,41,0.05)",
            border: "1px solid rgba(240,180,41,0.3)",
            color: "var(--accent-gold)",
          }}
        >
          {result.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </section>
      )}

      {/* Top stats grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Length" value={`${result.input_summary.length_bp.toLocaleString()} bp`} />
        <Stat label="GC content" value={`${(result.input_summary.gc_content * 100).toFixed(1)}%`} />
        <Stat label="Best match" value={result.best_gene_match.gene} accent />
        <Stat label="Mapping quality" value={String(result.best_gene_match.mapping_quality)} />
      </section>

      {/* Two-column lower section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel-card genomic space-y-3">
          <span className="panel-label">K-mer Similarity</span>
          <ul className="space-y-2">
            {result.kmer_similarity
              .slice()
              .sort((a, b) => b.similarity - a.similarity)
              .map((k) => (
                <li key={k.gene} className="flex items-center gap-2">
                  <span className="w-16 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                    {k.gene}
                  </span>
                  <div
                    className="flex-1 h-2 rounded"
                    style={{ background: "rgba(122,156,199,0.1)" }}
                  >
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.max(0, Math.min(1, k.similarity)) * 100}%`,
                        background: "var(--accent-teal)",
                      }}
                    />
                  </div>
                  <span
                    className="w-14 text-right text-xs font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {k.similarity.toFixed(3)}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        <div className="panel-card genomic space-y-3">
          <span className="panel-label">Protein Translation</span>
          <div className="text-xs font-mono break-all leading-relaxed">
            <span style={{ color: "var(--text-muted)" }}>First 50 aa:</span>
            <br />
            <span style={{ color: "var(--accent-teal)" }}>{result.protein.first_aa || "—"}</span>
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
            Length: {result.protein.length} aa
            {result.protein.stop_codon_at !== null && (
              <span className="ml-2">| Stop codon at {result.protein.stop_codon_at}</span>
            )}
          </div>
        </div>
      </section>

      {/* Variants */}
      <section className="panel-card warning space-y-3">
        <span className="panel-label">
          Variants ({result.variants.length})
          {result.variants.length === 100 && <span className="ml-1">— first 100 shown</span>}
        </span>
        {result.variants.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            No mismatches detected against {result.best_gene_match.gene} reference.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--bg-border)" }}>
                  <th className="text-left py-1.5 px-2">Position</th>
                  <th className="text-left py-1.5 px-2">Ref</th>
                  <th className="text-left py-1.5 px-2">Alt</th>
                  <th className="text-left py-1.5 px-2">Annotation</th>
                </tr>
              </thead>
              <tbody>
                {result.variants.map((v, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid rgba(122,156,199,0.05)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <td className="py-1.5 px-2">{v.position}</td>
                    <td className="py-1.5 px-2">{v.ref_base}</td>
                    <td className="py-1.5 px-2" style={{ color: "var(--accent-red)" }}>
                      {v.alt_base}
                    </td>
                    <td className="py-1.5 px-2" style={{ color: "var(--accent-gold)" }}>
                      {v.annotation ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pharmacogenomics */}
      {result.pharma && (
        <section className="panel-card safla space-y-3">
          <span className="panel-label">Pharmacogenomics</span>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <Stat label="Allele 1" value={result.pharma.allele1} />
            <Stat label="Allele 2" value={result.pharma.allele2} />
            <Stat label="Phenotype" value={result.pharma.phenotype} accent />
          </div>
          <div className="space-y-2">
            {result.pharma.recommendations.map((r, i) => (
              <div
                key={i}
                className="rounded p-2 text-xs"
                style={{
                  background: "rgba(0,229,160,0.05)",
                  border: "1px solid rgba(0,229,160,0.2)",
                }}
              >
                <div className="font-semibold" style={{ color: "var(--safla-green)" }}>
                  {r.drug} <span style={{ color: "var(--text-muted)" }}>· dose ×{r.dose_factor}</span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>{r.recommendation}</div>
              </div>
            ))}
          </div>
          <div className="text-xs italic" style={{ color: "var(--text-muted)" }}>
            {result.pharma.note}
          </div>
        </section>
      )}

      {/* Disclaimer footer */}
      <footer className="text-xs italic text-center" style={{ color: "var(--text-muted)" }}>
        {result.disclaimer}
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
      }}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="text-base font-semibold mt-0.5"
        style={{ color: accent ? "var(--accent-teal)" : "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}
