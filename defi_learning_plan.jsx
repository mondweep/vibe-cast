import { useState, useEffect } from "react";

const PHASES = [
  {
    id: 1, label: "Phase 1", title: "Protocol Immersion", weeks: "Weeks 1–2",
    color: "#00C2CB", bg: "#001F22", icon: "⛓",
    goal: "Convert DeFi certification knowledge into first-hand protocol experience. By end of Week 2 you should be able to describe a live Aave loop position from personal experience — not theory.",
    jdMap: "aToken mechanics · loop strategies · risk parameters · on-chain fluency",
    weeks_data: [
      {
        week: 1, title: "Aave Deep Dive",
        tasks: [
          { id: "1a", text: "Read Aave v3 risk documentation in full — LTV ratios, liquidation thresholds, e-mode parameters for each asset class", resource: "https://docs.aave.com/risk/" },
          { id: "1b", text: "Supply USDC or ETH to Aave (even £50–100). Watch your aToken balance accrue in real time. Note the exchange rate mechanics", resource: "https://app.aave.com" },
          { id: "1c", text: "Borrow against your supplied collateral. Calculate your health factor manually before and after", resource: "https://docs.aave.com/developers/guides/liquidations" },
          { id: "1d", text: "Run a single-loop strategy: supply → borrow → swap → supply. Document every step, fee, and rate change", resource: "https://app.aave.com" },
          { id: "1e", text: "Read Aave governance forum — find 3 active proposals about risk parameters or incentives and understand what's being debated", resource: "https://governance.aave.com" },
          { id: "1f", text: "Study Aave's revenue model: how protocol fees, treasury, and DAO incentives interact with LP behaviour", resource: "https://tokenterminal.com/terminal/projects/aave" },
        ]
      },
      {
        week: 2, title: "Compound, Curve & Comparative Mechanics",
        tasks: [
          { id: "2a", text: "Supply to Compound v3 (Comet). Compare cToken mechanics to Aave's aTokens — note architectural differences and what they mean for LP risk", resource: "https://app.compound.finance" },
          { id: "2b", text: "Study Curve Finance: provide liquidity to a stablecoin pool. Understand the bonding curve and why it minimises slippage vs. Uniswap", resource: "https://curve.fi" },
          { id: "2c", text: "Read about Curve's gauge system and veCRV voting — this is how protocols compete for liquidity incentives (directly relevant to LP acquisition)", resource: "https://resources.curve.fi/governance/understanding-gauges/" },
          { id: "2d", text: "Provide liquidity on Uniswap v3 in a concentrated range. Track impermanent loss vs. fees earned", resource: "https://app.uniswap.org" },
          { id: "2e", text: "Write a 500-word personal note comparing Aave, Compound, and Curve from an LP's perspective — what would drive capital allocation to each?", resource: null },
          { id: "2f", text: "Study one liquidation event on Aave using on-chain data — find a historical liquidation tx and reverse-engineer what happened to the health factor", resource: "https://etherscan.io" },
        ]
      }
    ]
  },
  {
    id: 2, label: "Phase 2", title: "On-Chain Data Mastery", weeks: "Weeks 2–4",
    color: "#F5A623", bg: "#1F1800", icon: "📊",
    goal: "Build the ability to construct targeted LP outreach lists and understand capital flow patterns from on-chain data — the specific analytical requirement called out in the JD.",
    jdMap: "on-chain data & analytics · targeted outreach lists · capital flow patterns",
    weeks_data: [
      {
        week: 3, title: "Dune Analytics — Build Your First Dashboards",
        tasks: [
          { id: "3a", text: "Complete Dune's official SQL onboarding — learn to query decoded protocol tables (aave_v3.Supply, uniswap_v3.Swap, etc.)", resource: "https://dune.com/docs/learning/dune-analytics/tutorials/" },
          { id: "3b", text: "Dashboard 1: TVL inflows/outflows for one protocol over 90 days. Filter by wallet size (>$100k). Identify the top 20 depositors by address", resource: "https://dune.com" },
          { id: "3c", text: "Dashboard 2: Whale wallet movement — track wallets that moved >$500k into/out of Aave in the last 30 days. Label any you can identify", resource: "https://dune.com" },
          { id: "3d", text: "Dashboard 3: LP capital flow patterns — which pools are gaining TVL, from which wallet cohorts, and at what times?", resource: "https://dune.com" },
          { id: "3e", text: "Make one dashboard public on your Dune profile. This is a portfolio asset for interviews", resource: "https://dune.com" },
        ]
      },
      {
        week: 4, title: "Nansen, DeBank & LP Profiling",
        tasks: [
          { id: "4a", text: "Set up Nansen free trial. Study 'Smart Money' labels — understand which wallet cohorts they track and how they define institutional vs. retail behaviour", resource: "https://www.nansen.ai" },
          { id: "4b", text: "Use DeBank to profile 10 high-value wallets identified from your Dune dashboard. Understand their full DeFi portfolio positions", resource: "https://debank.com" },
          { id: "4c", text: "Use Arkham Intelligence to cross-reference wallets with known entity labels (funds, DAOs, protocols)", resource: "https://intel.arkm.com" },
          { id: "4d", text: "Build a manual LP target list: 20 wallets categorised as (a) institutional funds, (b) DAO treasuries, (c) on-chain whales — with current protocol allocation and estimated yield targets", resource: null },
          { id: "4e", text: "Research Token Terminal and DeFiLlama as macro TVL intelligence sources — learn to read protocol revenue, fee generation, and LP incentive spend", resource: "https://tokenterminal.com" },
          { id: "4f", text: "Study one real DAO treasury: read their governance forum, treasury management reports, and current DeFi yield strategy (e.g., Uniswap, Arbitrum, MakerDAO)", resource: "https://forum.makerdao.com" },
        ]
      }
    ]
  },
  {
    id: 3, label: "Phase 3", title: "Network & Community", weeks: "Weeks 3–6",
    color: "#7C5CBF", bg: "#120E1F", icon: "🌐",
    goal: "Build the DeFi-native network that your institutional BD background cannot substitute. Target: 3 meaningful conversations with DeFi treasury managers or DAO contributors by end of Week 6.",
    jdMap: "DeFi-native treasuries · institutional allocators · custodians · network",
    weeks_data: [
      {
        week: "3–4", title: "Governance Participation",
        tasks: [
          { id: "5a", text: "Create accounts on Aave, Uniswap, and Compound governance forums. Read the last 10 active proposals on each", resource: "https://governance.aave.com" },
          { id: "5b", text: "Post one substantive comment on an Aave or Uniswap governance proposal — frame it around capital efficiency or LP incentive design", resource: "https://gov.uniswap.org" },
          { id: "5c", text: "Follow 30 DeFi-native accounts on X/Twitter: protocol leads, DAO contributors, institutional crypto allocators, and DeFi researchers. Engage substantively", resource: "https://twitter.com" },
          { id: "5d", text: "Join Discord servers: Aave, Uniswap, Curve, and one institutional DeFi server (Bankless DAO, Index Coop). Participate in #governance or #treasury channels", resource: null },
        ]
      },
      {
        week: "5–6", title: "Outreach & Events",
        tasks: [
          { id: "6a", text: "Identify 10 DeFi treasury managers whose governance forum activity you can reference. Send tailored outreach on LinkedIn or X — lead with a specific insight about their treasury strategy", resource: null },
          { id: "6b", text: "Attend one DeFi-focused event or hackathon in person or online (ETHGlobal, DeFi conference track, or London Web3 meetup)", resource: "https://ethglobal.com" },
          { id: "6c", text: "Research Fireblocks, Copper, and Anchorage — the major institutional DeFi custody providers. Understand their LP onboarding flows", resource: "https://www.fireblocks.com" },
          { id: "6d", text: "Leverage existing TradFi network: identify 5 contacts from HSBC, MUFG, or Shell Energy now at crypto-adjacent institutions. Reconnect for intelligence on their DeFi allocation strategy", resource: null },
          { id: "6e", text: "Use your Agentics Foundation community as a springboard — connect with any blockchain-native members in the London chapter", resource: "https://london.agentics.org" },
        ]
      }
    ]
  },
  {
    id: 4, label: "Phase 4", title: "Thought Leadership", weeks: "Weeks 4–8",
    color: "#E84B3A", bg: "#200A08", icon: "✍️",
    goal: "Build a visible, practitioner-level DeFi content portfolio that signals fluency to hiring panels. 4 strong pieces beats 10 thin ones.",
    jdMap: "value proposition narrative · LP profile targeting · domain credibility",
    weeks_data: [
      {
        week: "4–5", title: "Content Creation — Articles",
        tasks: [
          { id: "7a", text: "Article 1: 'How DeFi Lending Protocols Compete for Institutional Liquidity — An Incentive Design Framework'. ~800 words on Medium. Draw on Phase 1 protocol experience", resource: "https://medium.com" },
          { id: "7b", text: "Article 2: 'On-Chain LP Profiling: Using Dune Analytics to Build a Targeted Capital Outreach List'. Walk through your dashboard methodology with screenshots — a direct portfolio piece", resource: "https://medium.com" },
          { id: "7c", text: "Article 3: 'What Institutional Allocators Need Before Entering DeFi — A TradFi-Native Perspective'. Your differentiator piece — write as someone who has lived on both sides", resource: "https://medium.com" },
        ]
      },
      {
        week: "6–8", title: "Profile & Portfolio Finalisation",
        tasks: [
          { id: "8a", text: "Update LinkedIn: add all DeFi certifications with Duke University attribution, DeFi & Web3 skills section, and link Medium articles + public Dune dashboards in Featured", resource: "https://linkedin.com" },
          { id: "8b", text: "Create GitHub repo 'defi-lp-intelligence' — publish Dune SQL queries, LP target list methodology, and any on-chain analysis scripts", resource: "https://github.com/mondweep" },
          { id: "8c", text: "Article 4: 'TVL Attribution in DeFi Growth — Building an LP Pipeline Framework from First Principles'. Interview prep in article form — forces you to systematise the core problem this role requires", resource: "https://medium.com" },
          { id: "8d", text: "Prepare 10-minute live interview walkthrough: open Aave app, walk through your position, explain health factor and loop strategy, then open Dune dashboard and narrate the LP flow analysis. Rehearse until fluent", resource: "https://app.aave.com" },
          { id: "8e", text: "Update CV 'Active Skill-Building' section — convert the forward-looking commitment to a backward-looking achievement list as each phase completes", resource: null },
        ]
      }
    ]
  }
];

const RESOURCES = [
  { category: "Protocol Interfaces", items: [
    { name: "Aave App", url: "https://app.aave.com", desc: "Primary lending protocol — supply, borrow, loop" },
    { name: "Aave Docs", url: "https://docs.aave.com", desc: "Risk parameters, aToken mechanics, governance" },
    { name: "Curve Finance", url: "https://curve.fi", desc: "Stablecoin AMM, gauge system, veCRV" },
    { name: "Uniswap App", url: "https://app.uniswap.org", desc: "Concentrated liquidity LP experience" },
    { name: "Compound v3", url: "https://app.compound.finance", desc: "Comet architecture, compare to Aave" },
  ]},
  { category: "On-Chain Data", items: [
    { name: "Dune Analytics", url: "https://dune.com", desc: "Build SQL dashboards on decoded protocol data" },
    { name: "Nansen", url: "https://www.nansen.ai", desc: "Smart Money labels, institutional wallet tracking" },
    { name: "DeBank", url: "https://debank.com", desc: "Full DeFi portfolio profiling per wallet" },
    { name: "DeFiLlama", url: "https://defillama.com", desc: "Protocol TVL, chain-level flows, yields" },
    { name: "Token Terminal", url: "https://tokenterminal.com", desc: "Protocol revenue, fee generation, LP incentive spend" },
    { name: "Arkham Intel", url: "https://intel.arkm.com", desc: "Entity labelling for institutional wallet identification" },
  ]},
  { category: "Community & Governance", items: [
    { name: "Aave Governance", url: "https://governance.aave.com", desc: "Active proposals on risk params & incentives" },
    { name: "Uniswap Forum", url: "https://gov.uniswap.org", desc: "Fee switch debates, liquidity incentive design" },
    { name: "MakerDAO Forum", url: "https://forum.makerdao.com", desc: "Study a real institutional-grade DAO treasury" },
    { name: "ETHGlobal Events", url: "https://ethglobal.com", desc: "Hackathons, DeFi track conferences" },
  ]},
  { category: "Reading & Research", items: [
    { name: "Aave Risk Docs", url: "https://docs.aave.com/risk/", desc: "Definitive source on aToken risk parameters" },
    { name: "Curve Resources", url: "https://resources.curve.fi", desc: "AMM design, gauge mechanics, veCRV system" },
    { name: "Bankless", url: "https://bankless.com", desc: "Institutional DeFi narrative, weekly deep dives" },
    { name: "The Defiant", url: "https://thedefiant.io", desc: "DeFi-native news and protocol analysis" },
    { name: "Delphi Digital", url: "https://delphidigital.io", desc: "Institutional-grade DeFi research reports" },
  ]}
];

const STORAGE_KEY = "mondweep-defi-plan-v1";

export default function LearningPlan() {
  const [activePhase, setActivePhase] = useState(0);
  const [checked, setChecked] = useState({});
  const [view, setView] = useState("plan");
  const [storageStatus, setStorageStatus] = useState("loading");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          setChecked(JSON.parse(result.value));
        }
        setStorageStatus("idle");
      } catch {
        setStorageStatus("idle");
      }
      setLoaded(true);
    }
    loadProgress();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let t;
    async function save() {
      setStorageStatus("saving");
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(checked));
        setStorageStatus("saved");
        t = setTimeout(() => setStorageStatus("idle"), 2200);
      } catch {
        setStorageStatus("error");
      }
    }
    save();
    return () => clearTimeout(t);
  }, [checked, loaded]);

  const toggle = (id) => setChecked(c => ({ ...c, [id]: !c[id] }));

  const allTasks = PHASES.flatMap(p => p.weeks_data.flatMap(w => w.tasks));
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => checked[t.id]).length;
  const pct = Math.round((completedTasks / totalTasks) * 100);

  const phase = PHASES[activePhase];
  const statusColors = { loading: "#4A6A8A", idle: "#2A4A6A", saving: "#F5A623", saved: "#4CAF50", error: "#E84B3A" };
  const statusLabels = { loading: "Loading…", idle: "Auto-saved", saving: "Saving…", saved: "Saved ✓", error: "Save failed" };

  if (!loaded) {
    return (
      <div style={{ fontFamily: "monospace", background: "#0A0E14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⛓</div>
          <div style={{ fontSize: 12, color: "#4A6A8A" }}>Loading your saved progress…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace", background: "#0A0E14", minHeight: "100vh", color: "#C8D6E5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0A0E14}
        ::-webkit-scrollbar-thumb{background:#2A3A4A;border-radius:2px}
        .tr{transition:background 0.12s}
        .tr:hover{background:rgba(255,255,255,0.025)!important}
        .pb{transition:all 0.18s;cursor:pointer;border:none}
        .pb:hover{opacity:0.88}
        .rc{transition:all 0.14s}
        .rc:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.18)!important}
        .nt{transition:all 0.12s;cursor:pointer}
        .nt:hover{opacity:0.75}
        .cb{transition:transform 0.12s}
        .cb:hover{transform:scale(1.12)}
        a{color:inherit;text-decoration:none}
        a:hover{text-decoration:underline}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#0D1A26,#0A1520)", borderBottom:"1px solid #1C2E3E", padding:"22px 30px 0" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, paddingBottom:18 }}>
          <div>
            <div style={{ fontSize:8, letterSpacing:"0.2em", color:"#3A5A7A", marginBottom:5, textTransform:"uppercase" }}>
              MONDWEEP CHAKRAVORTY · GROWTH RELATIONS MANAGER
            </div>
            <h1 style={{ fontFamily:"'Libre Baskerville',Georgia,serif", fontSize:22, fontWeight:700, color:"#E8F4FF", letterSpacing:"-0.02em", lineHeight:1.2 }}>
              DeFi Suitability Learning Plan
            </h1>
            <div style={{ fontSize:9, color:"#3A5A7A", marginTop:4 }}>
              8-week programme · 4 phases · {totalTasks} tasks · progress saved permanently
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:8, color:"#3A5A7A", letterSpacing:"0.1em", marginBottom:3 }}>OVERALL PROGRESS</div>
            <div style={{ fontSize:34, fontWeight:600, color:"#00C2CB", lineHeight:1 }}>{pct}<span style={{ fontSize:14 }}>%</span></div>
            <div style={{ fontSize:9, color:"#3A5A7A", marginTop:2 }}>{completedTasks} of {totalTasks} complete</div>
            <div style={{ width:130, height:3, background:"#1C2E3E", borderRadius:2, marginTop:7, marginLeft:"auto" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#00C2CB,#7C5CBF)", borderRadius:2, transition:"width 0.5s ease" }} />
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:22, borderBottom:"1px solid #1C2E3E" }}>
          {["plan","resources"].map(tab => (
            <div key={tab} className="nt" onClick={() => setView(tab)} style={{
              fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", paddingBottom:9, fontWeight:500,
              color: view===tab ? "#00C2CB" : "#3A5A7A",
              borderBottom: view===tab ? "2px solid #00C2CB" : "2px solid transparent",
            }}>{tab === "plan" ? "Learning Plan" : "Resource Library"}</div>
          ))}
        </div>
      </div>

      {view === "plan" ? (
        <div style={{ display:"flex", minHeight:"calc(100vh - 130px)" }}>
          {/* ── SIDEBAR ── */}
          <div style={{ width:188, flexShrink:0, background:"#080C11", borderRight:"1px solid #1C2E3E", display:"flex", flexDirection:"column" }}>
            <div style={{ flex:1 }}>
              {PHASES.map((p, i) => {
                const pTasks = p.weeks_data.flatMap(w => w.tasks);
                const pDone = pTasks.filter(t => checked[t.id]).length;
                const pp = Math.round((pDone / pTasks.length) * 100);
                const isActive = activePhase === i;
                return (
                  <button key={p.id} className="pb" onClick={() => setActivePhase(i)} style={{
                    display:"block", width:"100%", textAlign:"left", padding:"11px 16px",
                    background: isActive ? p.bg : "transparent",
                    borderLeft: isActive ? `3px solid ${p.color}` : "3px solid transparent",
                  }}>
                    <div style={{ fontSize:7, color: isActive ? p.color : "#1E3A5A", letterSpacing:"0.15em", marginBottom:2, textTransform:"uppercase" }}>{p.label}</div>
                    <div style={{ fontSize:11, color: isActive ? "#E8F4FF" : "#3A5A7A", fontWeight:500, marginBottom:1 }}>{p.title}</div>
                    <div style={{ fontSize:8, color:"#1E3A5A", marginBottom:6 }}>{p.weeks}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ flex:1, height:2, background:"#1C2E3E", borderRadius:1 }}>
                        <div style={{ width:`${pp}%`, height:"100%", background: pp===100 ? "#4CAF50" : p.color, borderRadius:1, transition:"width 0.3s" }} />
                      </div>
                      <span style={{ fontSize:8, color: pp===100 ? "#4CAF50" : p.color, minWidth:26 }}>{pp}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Storage badge */}
            <div style={{ padding:"12px 16px", borderTop:"1px solid #1C2E3E" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:statusColors[storageStatus], flexShrink:0 }} />
                <span style={{ fontSize:8, color:statusColors[storageStatus], letterSpacing:"0.05em" }}>{statusLabels[storageStatus]}</span>
              </div>
              <div style={{ fontSize:7, color:"#1E3A5A", marginTop:3 }}>Progress saved across sessions</div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex:1, padding:"22px 26px", overflowY:"auto" }}>
            {/* Phase banner */}
            <div style={{ background:phase.bg, border:`1px solid ${phase.color}22`, borderRadius:8, padding:"16px 20px", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:9 }}>
                <span style={{ fontSize:24 }}>{phase.icon}</span>
                <div>
                  <div style={{ fontSize:7, color:phase.color, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>{phase.label} · {phase.weeks}</div>
                  <h2 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:17, color:"#E8F4FF" }}>{phase.title}</h2>
                </div>
              </div>
              <p style={{ fontSize:11, lineHeight:1.7, color:"#8AA8C4", marginBottom:9 }}>{phase.goal}</p>
              <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                <div style={{ fontSize:7, color:"#3A5A7A", textTransform:"uppercase", letterSpacing:"0.1em" }}>JD Requirement:</div>
                <div style={{ fontSize:9, color:phase.color, fontStyle:"italic" }}>{phase.jdMap}</div>
              </div>
            </div>

            {/* Week blocks */}
            {phase.weeks_data.map((wk, wi) => {
              const wDone = wk.tasks.filter(t => checked[t.id]).length;
              const allDone = wDone === wk.tasks.length;
              return (
                <div key={wi} style={{ marginBottom:22 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10 }}>
                    <div style={{ background: allDone ? "#4CAF50" : phase.color, color:"#000", fontSize:7, fontWeight:700, letterSpacing:"0.1em", padding:"3px 9px", borderRadius:3, textTransform:"uppercase" }}>
                      Week {wk.week}
                    </div>
                    <div style={{ fontSize:12, color:"#C8D6E5", fontWeight:500 }}>{wk.title}</div>
                    <div style={{ marginLeft:"auto", fontSize:8, color: allDone ? "#4CAF50" : "#3A5A7A" }}>
                      {allDone ? "✓ Complete" : `${wDone} / ${wk.tasks.length}`}
                    </div>
                  </div>
                  <div style={{ border:"1px solid #1C2E3E", borderRadius:6, overflow:"hidden" }}>
                    {wk.tasks.map((task, ti) => {
                      const done = !!checked[task.id];
                      return (
                        <div key={task.id} className="tr" style={{
                          display:"flex", alignItems:"flex-start", gap:11, padding:"12px 15px",
                          borderBottom: ti < wk.tasks.length - 1 ? "1px solid #111820" : "none",
                          background: done ? "rgba(0,194,203,0.035)" : "transparent",
                        }}>
                          <button className="cb" onClick={() => toggle(task.id)} style={{
                            width:16, height:16, borderRadius:3, flexShrink:0, marginTop:2,
                            background: done ? phase.color : "transparent",
                            border:`1.5px solid ${done ? phase.color : "#2A4A6A"}`,
                            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"
                          }}>
                            {done && <span style={{ fontSize:8, color:"#000", fontWeight:900 }}>✓</span>}
                          </button>
                          <div style={{ flex:1 }}>
                            <div style={{
                              fontSize:11, lineHeight:1.65,
                              color: done ? "#2A4A6A" : "#C8D6E5",
                              textDecoration: done ? "line-through" : "none",
                              textDecorationColor:"#2A4A6A",
                            }}>{task.text}</div>
                            {task.resource && (
                              <a href={task.resource} target="_blank" rel="noreferrer" style={{ display:"inline-block", marginTop:4, fontSize:8, color: done ? "#1E3A5A" : phase.color }}>
                                → {task.resource.replace("https://","").split("/")[0]}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── RESOURCES VIEW ── */
        <div style={{ padding:"22px 30px" }}>
          <div style={{ marginBottom:18 }}>
            <h2 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:19, color:"#E8F4FF", marginBottom:4 }}>Resource Library</h2>
            <p style={{ fontSize:10, color:"#3A5A7A" }}>All tools, platforms, and reading material — click any card to open</p>
          </div>
          {RESOURCES.map((cat, ci) => (
            <div key={ci} style={{ marginBottom:26 }}>
              <div style={{ fontSize:7, color:"#00C2CB", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:9, borderBottom:"1px solid #1C2E3E", paddingBottom:6 }}>
                {cat.category}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:9 }}>
                {cat.items.map((item, ii) => (
                  <a key={ii} href={item.url} target="_blank" rel="noreferrer">
                    <div className="rc" style={{ background:"#0D1520", border:"1px solid #1C2E3E", borderRadius:6, padding:"12px 14px", cursor:"pointer" }}>
                      <div style={{ fontSize:11, color:"#E8F4FF", fontWeight:500, marginBottom:3 }}>{item.name}</div>
                      <div style={{ fontSize:10, color:"#3A5A7A", lineHeight:1.5 }}>{item.desc}</div>
                      <div style={{ fontSize:7, color:"#1E3A5A", marginTop:6 }}>{item.url.replace("https://","")}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ borderTop:"1px solid #1C2E3E", padding:"9px 30px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#080C11" }}>
        <div style={{ fontSize:7, color:"#1E3A5A", letterSpacing:"0.1em" }}>
          {completedTasks} TASKS COMPLETE · {totalTasks - completedTasks} REMAINING · TARGET: Growth Relations Manager
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:4, height:4, borderRadius:"50%", background:statusColors[storageStatus] }} />
          <span style={{ fontSize:7, color:statusColors[storageStatus], letterSpacing:"0.08em" }}>{statusLabels[storageStatus].toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
