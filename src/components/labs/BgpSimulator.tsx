"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BgpRoute {
  id: string;
  prefix: string;
  neighbor: string;
  weight: number;
  localPref: number;
  asPath: string[];
  origin: "IGP"|"EGP"|"Incomplete";
  med: number;
  type: "eBGP"|"iBGP";
  label: string;
}

const ORIGIN_SCORE: Record<string, number> = { IGP: 0, EGP: 1, Incomplete: 2 };

function selectBestPath(routes: BgpRoute[]): { winner: BgpRoute; reason: string } | null {
  if (routes.length === 0) return null;
  if (routes.length === 1) return { winner: routes[0], reason: "Only path available" };

  let candidates = [...routes];

  // Step 1: Weight
  const maxWeight = Math.max(...candidates.map(r => r.weight));
  candidates = candidates.filter(r => r.weight === maxWeight);
  if (candidates.length === 1) return { winner: candidates[0], reason: `Highest Weight (${maxWeight})` };

  // Step 2: Local Preference
  const maxLP = Math.max(...candidates.map(r => r.localPref));
  candidates = candidates.filter(r => r.localPref === maxLP);
  if (candidates.length === 1) return { winner: candidates[0], reason: `Highest Local Preference (${maxLP})` };
  reason = `Tied on Local Pref (${maxLP})`;

  // Step 4: AS_PATH length
  const minPath = Math.min(...candidates.map(r => r.asPath.length));
  candidates = candidates.filter(r => r.asPath.length === minPath);
  if (candidates.length === 1) return { winner: candidates[0], reason: `Shortest AS_PATH (${minPath} hops)` };

  // Step 5: Origin
  const minOrigin = Math.min(...candidates.map(r => ORIGIN_SCORE[r.origin]));
  candidates = candidates.filter(r => ORIGIN_SCORE[r.origin] === minOrigin);
  if (candidates.length === 1) return { winner: candidates[0], reason: `Best Origin (${candidates[0].origin})` };

  // Step 6: MED
  const minMed = Math.min(...candidates.map(r => r.med));
  candidates = candidates.filter(r => r.med === minMed);
  if (candidates.length === 1) return { winner: candidates[0], reason: `Lowest MED (${minMed})` };

  // Step 7: eBGP over iBGP
  const ebgp = candidates.filter(r => r.type === "eBGP");
  if (ebgp.length > 0 && ebgp.length < candidates.length) {
    return { winner: ebgp[0], reason: "eBGP preferred over iBGP" };
  }

  return { winner: candidates[0], reason: "Tiebreak: first in list" };
}

const DEFAULT_ROUTES: BgpRoute[] = [
  { id: "r1", prefix: "10.0.0.0/8", neighbor: "DX-Primary", weight: 0, localPref: 100, asPath: ["65000"], origin: "IGP", med: 0, type: "eBGP", label: "Direct Connect" },
  { id: "r2", prefix: "10.0.0.0/8", neighbor: "VPN-Backup", weight: 0, localPref: 100, asPath: ["65000","65000","65000","65000"], origin: "IGP", med: 0, type: "eBGP", label: "Site-to-Site VPN" },
];

export function BgpSimulator() {
  const [routes, setRoutes] = useState<BgpRoute[]>(DEFAULT_ROUTES);
  const [result, setResult] = useState<{winner: BgpRoute; reason: string} | null>(null);

  function update(id: string, field: keyof BgpRoute, value: string | number | string[]) {
    setRoutes(routes.map(r => r.id === id ? { ...r, [field]: value } : r));
    setResult(null);
  }

  function simulate() { setResult(selectBestPath(routes)); }

  function reset() { setRoutes(DEFAULT_ROUTES); setResult(null); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground">BGP Path Simulator</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Adjust attributes and see which path BGP selects</p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="font-mono text-xs">Reset</Button>
      </div>

      <div className="space-y-4">
        {routes.map((r) => (
          <div key={r.id} className={cn("rounded-lg border p-4 transition-all",
            result?.winner.id === r.id ? "border-primary bg-primary/5" : "border-border bg-card")}>
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("w-2 h-2 rounded-full", result?.winner.id === r.id ? "bg-primary" : "bg-muted")} />
              <input value={r.label} onChange={e => update(r.id, "label", e.target.value)}
                className="text-sm font-bold text-foreground bg-transparent border-none outline-none flex-1" />
              {result?.winner.id === r.id && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-mono">BEST PATH</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              {[
                { label: "Weight", field: "weight" as const, hint: "Higher = preferred (local)" },
                { label: "Local Pref", field: "localPref" as const, hint: "Higher = preferred (iBGP)" },
                { label: "MED", field: "med" as const, hint: "Lower = preferred" },
              ].map(({ label, field, hint }) => (
                <div key={field}>
                  <p className="text-muted-foreground mb-1">{label}</p>
                  <input type="number" value={r[field] as number}
                    onChange={e => update(r.id, field, parseInt(e.target.value)||0)}
                    className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">AS_PATH <span className="text-[10px]">(shorter = preferred)</span></p>
                <input value={r.asPath.join(" ")}
                  onChange={e => update(r.id, "asPath", e.target.value.split(/\s+/).filter(Boolean))}
                  className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-foreground" />
                <p className="text-[10px] text-muted-foreground mt-1">Length: {r.asPath.length} hops</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Origin</p>
                <select value={r.origin} onChange={e => update(r.id, "origin", e.target.value as "IGP"|"EGP"|"Incomplete")}
                  className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-foreground">
                  <option>IGP</option><option>EGP</option><option>Incomplete</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">IGP &gt; EGP &gt; Incomplete</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={simulate} className="w-full font-mono">Run BGP Path Selection →</Button>

      {result && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs text-primary font-mono font-bold uppercase tracking-wider mb-2">Result</p>
          <p className="font-bold text-foreground">{result.winner.label} wins</p>
          <p className="text-sm text-muted-foreground mt-1">Decision: <span className="text-primary font-mono">{result.reason}</span></p>
          <div className="mt-3 text-xs text-muted-foreground">
            <p>BGP selection algorithm evaluated {routes.length} paths. The winner had the decisive advantage at: <strong className="text-foreground">{result.reason}</strong>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
