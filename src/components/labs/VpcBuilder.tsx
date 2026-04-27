"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Subnet { id: string; name: string; type: "public" | "private" | "isolated"; cidr: string; az: string; }
interface RouteEntry { dest: string; target: string; }

const AZS = ["eu-west-1a","eu-west-1b","eu-west-1c"];
const SUBNET_TYPES = [
  { type: "public" as const, label: "Public", color: "bg-blue-500/20 border-blue-500/50 text-blue-300", desc: "IGW route" },
  { type: "private" as const, label: "Private", color: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300", desc: "NAT GW route" },
  { type: "isolated" as const, label: "Isolated", color: "bg-slate-500/20 border-slate-500/50 text-slate-300", desc: "Local only" },
];

export function VpcBuilder() {
  const [vpcCidr, setVpcCidr] = useState("10.10.0.0/16");
  const [subnets, setSubnets] = useState<Subnet[]>([
    { id: "s1", name: "public-1a", type: "public", cidr: "10.10.1.0/24", az: "eu-west-1a" },
    { id: "s2", name: "private-1a", type: "private", cidr: "10.10.10.0/24", az: "eu-west-1a" },
    { id: "s3", name: "isolated-1a", type: "isolated", cidr: "10.10.20.0/28", az: "eu-west-1a" },
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addType, setAddType] = useState<"public"|"private"|"isolated">("private");
  const [addAz, setAddAz] = useState("eu-west-1b");
  const [validated, setValidated] = useState<null | { ok: boolean; messages: string[] }>(null);

  function addSubnet() {
    const octets = vpcCidr.split(".").slice(0,2).join(".");
    const third = subnets.length + 1;
    const newSubnet: Subnet = {
      id: `s${Date.now()}`,
      name: `${addType}-${addAz.split("-")[2]}`,
      type: addType,
      cidr: `${octets}.${third}.0/${addType === "isolated" ? "28" : "24"}`,
      az: addAz,
    };
    setSubnets([...subnets, newSubnet]);
  }

  function removeSubnet(id: string) {
    setSubnets(subnets.filter(s => s.id !== id));
    if (selected === id) setSelected(null);
  }

  function validate() {
    const messages: string[] = [];
    const azMap: Record<string, Subnet[]> = {};
    for (const s of subnets) { azMap[s.az] = [...(azMap[s.az]||[]), s]; }

    if (subnets.length === 0) messages.push("❌ No subnets defined");
    const hasPublic = subnets.some(s => s.type === "public");
    const hasPrivate = subnets.some(s => s.type === "private");
    if (!hasPublic) messages.push("⚠ No public subnet — instances cannot reach internet directly");
    if (!hasPrivate) messages.push("ℹ No private subnet — consider adding one for application tier");
    const azCount = Object.keys(azMap).length;
    if (azCount < 2) messages.push("⚠ Single AZ design — not highly available. Add subnets in ≥2 AZs");
    else messages.push(`✓ ${azCount} AZs used — good for availability`);
    if (hasPublic && hasPrivate) messages.push("✓ Three-tier design pattern detected");

    setValidated({ ok: messages.filter(m => m.startsWith("❌")).length === 0, messages });
  }

  const selectedSubnet = subnets.find(s => s.id === selected);
  const routes: RouteEntry[] = selectedSubnet
    ? selectedSubnet.type === "public"
      ? [{ dest: vpcCidr, target: "local" }, { dest: "0.0.0.0/0", target: "igw-xxxxxxxx" }]
      : selectedSubnet.type === "private"
      ? [{ dest: vpcCidr, target: "local" }, { dest: "0.0.0.0/0", target: "nat-xxxxxxxx" }]
      : [{ dest: vpcCidr, target: "local" }]
    : [];

  return (
    <div className="space-y-6">
      {/* VPC Header */}
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-primary font-mono font-bold uppercase tracking-widest">VPC</p>
            <p className="text-lg font-bold text-foreground font-mono">{vpcCidr}</p>
          </div>
          <input
            value={vpcCidr}
            onChange={e => setVpcCidr(e.target.value)}
            className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground w-40 text-right"
          />
        </div>
      </div>

      {/* AZ columns */}
      <div className="grid grid-cols-3 gap-3">
        {AZS.map(az => {
          const azSubnets = subnets.filter(s => s.az === az);
          return (
            <div key={az} className="rounded-lg border border-border bg-card/50 p-3">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">{az}</p>
              <div className="space-y-2">
                {azSubnets.map(s => {
                  const typeStyle = SUBNET_TYPES.find(t => t.type === s.type);
                  return (
                    <div key={s.id}
                      onClick={() => setSelected(selected === s.id ? null : s.id)}
                      className={cn("rounded border p-2 cursor-pointer transition-all text-left",
                        typeStyle?.color,
                        selected === s.id && "ring-2 ring-primary ring-offset-1 ring-offset-background")}>
                      <p className="text-xs font-mono font-bold">{s.name}</p>
                      <p className="text-[10px] opacity-75">{s.cidr}</p>
                    </div>
                  );
                })}
                {azSubnets.length === 0 && (
                  <div className="rounded border border-dashed border-border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add subnet */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Add Subnet</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {SUBNET_TYPES.map(t => (
              <button key={t.type} onClick={() => setAddType(t.type)}
                className={cn("px-3 py-1.5 rounded text-xs font-mono border transition-all",
                  addType === t.type ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                {t.label}
              </button>
            ))}
          </div>
          <select value={addAz} onChange={e => setAddAz(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground">
            {AZS.map(az => <option key={az} value={az}>{az}</option>)}
          </select>
          <Button onClick={addSubnet} size="sm" className="font-mono text-xs">+ Add</Button>
        </div>
      </div>

      {/* Route table preview */}
      {selectedSubnet && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Route Table — {selectedSubnet.name}
            <button onClick={() => removeSubnet(selectedSubnet.id)} className="ml-3 text-destructive/70 hover:text-destructive text-[10px]">remove</button>
          </p>
          <table className="w-full text-xs font-mono">
            <thead><tr className="border-b border-border"><th className="text-left pb-2 text-muted-foreground">Destination</th><th className="text-left pb-2 text-muted-foreground">Target</th></tr></thead>
            <tbody>{routes.map((r, i) => (
              <tr key={i} className="border-b border-border/50"><td className="py-1.5 text-foreground">{r.dest}</td><td className="py-1.5 text-primary">{r.target}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Validate */}
      <div className="flex items-center gap-3">
        <Button onClick={validate} variant="outline" className="font-mono">Validate Design</Button>
        {validated && (
          <Badge variant={validated.ok ? "aws" : "security"}>{validated.ok ? "✓ Valid" : "Issues found"}</Badge>
        )}
      </div>
      {validated && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5">
          {validated.messages.map((m, i) => (
            <p key={i} className={cn("text-sm", m.startsWith("✓") ? "text-emerald-400" : m.startsWith("⚠") ? "text-amber-400" : m.startsWith("❌") ? "text-red-400" : "text-muted-foreground")}>{m}</p>
          ))}
        </div>
      )}
    </div>
  );
}
