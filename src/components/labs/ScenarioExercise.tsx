"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Choice { id: string; text: string; isCorrect: boolean; explanation: string; }
interface Step { id: string; question: string; context?: string; choices: Choice[]; }
interface Scenario { id: string; title: string; description: string; steps: Step[]; }

const SCENARIOS: Scenario[] = [
  {
    id: "hybrid-design",
    title: "Enterprise Hybrid Connectivity",
    description: "Design a hybrid network for a financial services firm: 5 VPCs, on-premises DC, 99.99% availability requirement, compliance mandates encrypted private connectivity.",
    steps: [
      {
        id: "s1",
        question: "What connectivity technology meets the 99.99% availability SLA?",
        context: "The firm has two data centres in different cities. Budget allows for dedicated connections.",
        choices: [
          { id: "a", text: "Single Direct Connect 10Gbps dedicated connection", isCorrect: false, explanation: "A single DX connection provides no SLA. Single location = at most 99.9% with two connections." },
          { id: "b", text: "Two Direct Connect connections, each from a different DX location", isCorrect: true, explanation: "Correct! Maximum resiliency requires two connections from two different DX locations. This meets 99.99% SLA." },
          { id: "c", text: "Site-to-Site VPN with BGP", isCorrect: false, explanation: "VPN travels over the public internet and cannot guarantee latency or availability to enterprise SLA levels." },
          { id: "d", text: "Direct Connect + VPN in active-active", isCorrect: false, explanation: "This improves resilience but VPN over internet doesn't contribute to the DX 99.99% SLA calculation." },
        ],
      },
      {
        id: "s2",
        question: "How should you connect 5 VPCs and the on-premises DC?",
        context: "You need transitive routing between all VPCs and on-premises. Some VPCs should be isolated from others.",
        choices: [
          { id: "a", text: "VPC peering mesh between all 5 VPCs + VGW per VPC", isCorrect: false, explanation: "Peering is non-transitive and creates 10 peering connections. Doesn't scale and can't do on-premises transitive routing." },
          { id: "b", text: "Transit Gateway with segmented route tables + Direct Connect Gateway", isCorrect: true, explanation: "Correct! TGW provides transitive routing with segmentation via route tables. DXGW connects TGW to DX for on-premises." },
          { id: "c", text: "VPC sharing via RAM for all 5 accounts", isCorrect: false, explanation: "VPC sharing doesn't solve connectivity between VPCs — it shares subnets within one VPC across accounts." },
          { id: "d", text: "PrivateLink between all VPCs", isCorrect: false, explanation: "PrivateLink is one-directional service access, not general-purpose network connectivity." },
        ],
      },
      {
        id: "s3",
        question: "BGP is configured on the DX connections. Which design ensures DX is always preferred over VPN failover?",
        context: "You want VPN as failover only. Traffic should never flow over VPN when DX is healthy.",
        choices: [
          { id: "a", text: "Set higher Local Preference on DX routes in on-premises BGP", isCorrect: true, explanation: "Correct! Local Preference is preferred earlier in BGP selection than AS_PATH. Set LP=200 on DX, LP=100 on VPN." },
          { id: "b", text: "Advertise more specific /32 routes over DX", isCorrect: false, explanation: "More specific routes do work, but this is operationally complex and only affects AWS → on-premises direction." },
          { id: "c", text: "Set MED=0 on DX routes", isCorrect: false, explanation: "MED influences AWS route selection between multiple DX connections from the same AS, but is compared after AS_PATH." },
          { id: "d", text: "Use AS_PATH prepend on VPN to make it longer", isCorrect: false, explanation: "AS_PATH prepend helps, but Local Preference is evaluated before AS_PATH and is more reliable for this use case." },
        ],
      },
    ],
  },
  {
    id: "security-review",
    title: "Security Architecture Review",
    description: "A startup is moving to AWS. Review their network design for security gaps.",
    steps: [
      {
        id: "s1",
        question: "Their web tier EC2 instances are in a public subnet with a Security Group allowing 0.0.0.0/0 on port 443. What is the correct assessment?",
        context: "ALB sits in front of the EC2 instances. The EC2 SG also allows SSH from 0.0.0.0/0.",
        choices: [
          { id: "a", text: "The HTTPS rule is acceptable; remove the SSH 0.0.0.0/0 rule immediately", isCorrect: true, explanation: "HTTPS (443) from anywhere is standard for web traffic. SSH from 0.0.0.0/0 is a critical risk — use Systems Manager Session Manager or restrict to specific IPs." },
          { id: "b", text: "Both rules are fine — Security Groups are stateful", isCorrect: false, explanation: "Stateful means return traffic is allowed automatically, but it doesn't make open SSH secure. 0.0.0.0/0 on SSH is a critical vulnerability." },
          { id: "c", text: "Move instances to private subnet and remove both public rules", isCorrect: false, explanation: "Instances behind an ALB should ideally be in private subnets, but the ALB in the public subnet serving HTTPS is the correct pattern. This answer is partially right but overcorrects." },
          { id: "d", text: "Add a NACL to block port 22 inbound", isCorrect: false, explanation: "Fixing the Security Group is cleaner and more direct. NACLs add stateless rules that also block return traffic on ephemeral ports if not carefully configured." },
        ],
      },
    ],
  },
];

export function ScenarioExercise() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  const scenario = SCENARIOS[scenarioIdx];
  const step = scenario.steps[stepIdx];
  const choice = step.choices.find(c => c.id === selected);

  function submit() {
    if (!selected) return;
    const correct = choice?.isCorrect ?? false;
    setScore(s => s + (correct ? 1 : 0));
    setTotal(t => t + 1);
    setRevealed(true);
  }

  function next() {
    setSelected(null);
    setRevealed(false);
    if (stepIdx < scenario.steps.length - 1) {
      setStepIdx(s => s + 1);
    } else if (scenarioIdx < SCENARIOS.length - 1) {
      setScenarioIdx(s => s + 1);
      setStepIdx(0);
    } else {
      setDone(true);
    }
  }

  function restart() { setScenarioIdx(0); setStepIdx(0); setSelected(null); setRevealed(false); setScore(0); setTotal(0); setDone(false); }

  if (done) return (
    <div className="text-center py-12">
      <p className="text-4xl font-bold text-primary font-mono mb-2">{score}/{total}</p>
      <p className="text-lg font-bold text-foreground mb-1">Scenarios complete</p>
      <p className="text-muted-foreground text-sm mb-6">{score === total ? "Perfect score! " : score >= total * 0.7 ? "Good work. " : "Review the modules and try again. "}</p>
      <Button onClick={restart} className="font-mono">Restart Scenarios</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-primary font-mono font-bold uppercase tracking-wider">{scenario.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Step {stepIdx + 1} of {scenario.steps.length}</p>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{score}/{total} correct</span>
      </div>

      {/* Scenario context */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Scenario</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{scenario.description}</p>
        {step.context && <p className="mt-3 text-sm text-foreground leading-relaxed border-t border-border pt-3">{step.context}</p>}
      </div>

      {/* Question */}
      <p className="font-semibold text-foreground">{step.question}</p>

      {/* Choices */}
      <div className="space-y-2">
        {step.choices.map(c => (
          <button key={c.id} onClick={() => !revealed && setSelected(c.id)}
            className={cn("w-full text-left rounded-lg border p-4 transition-all text-sm",
              !revealed && selected === c.id ? "border-primary bg-primary/5" : "",
              !revealed && selected !== c.id ? "border-border bg-card hover:border-primary/30" : "",
              revealed && c.isCorrect ? "border-emerald-500 bg-emerald-500/10" : "",
              revealed && !c.isCorrect && selected === c.id ? "border-red-500 bg-red-500/10" : "",
              revealed && !c.isCorrect && selected !== c.id ? "border-border bg-card opacity-50" : "")}>
            <div className="flex items-start gap-3">
              <span className={cn("font-mono font-bold text-xs mt-0.5 shrink-0",
                revealed && c.isCorrect ? "text-emerald-400" :
                revealed && selected === c.id ? "text-red-400" : "text-muted-foreground")}>
                {c.id.toUpperCase()}.
              </span>
              <div>
                <p className="text-foreground">{c.text}</p>
                {revealed && selected === c.id && (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.explanation}</p>
                )}
                {revealed && c.isCorrect && selected !== c.id && (
                  <p className="mt-2 text-xs text-emerald-400 leading-relaxed">{c.explanation}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {!revealed
        ? <Button onClick={submit} disabled={!selected} className="w-full font-mono">Submit Answer</Button>
        : <Button onClick={next} className="w-full font-mono">
            {stepIdx < scenario.steps.length - 1 || scenarioIdx < SCENARIOS.length - 1 ? "Next Question →" : "View Results"}
          </Button>
      }
    </div>
  );
}
