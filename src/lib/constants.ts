export const PHASES = [
  {
    id: 1,
    label: "Phase 1",
    title: "Protocol Immersion",
    weeks: "Weeks 1–2",
    color: "#00C2CB",
    bg: "#001F22",
    icon: "⛓",
    goal: "Convert DeFi certification knowledge into first-hand protocol experience. By end of Week 2 you should be able to describe a live Aave loop position from personal experience — not theory.",
    jdMap: "aToken mechanics · loop strategies · risk parameters · on-chain fluency",
    weeks_data: [
      {
        week: 1,
        title: "Aave Deep Dive",
        tasks: [
          {
            id: "1a",
            text: "Read Aave v3 risk documentation in full — LTV ratios, liquidation thresholds, e-mode parameters for each asset class",
            resource: "https://docs.aave.com/risk/",
          },
          {
            id: "1b",
            text: "Supply USDC or ETH to Aave (even £50–100). Watch your aToken balance accrue in real time. Note the exchange rate mechanics",
            resource: "https://app.aave.com",
          },
          {
            id: "1c",
            text: "Borrow against your supplied collateral. Calculate your health factor manually before and after",
            resource: "https://docs.aave.com/developers/guides/liquidations",
          },
          {
            id: "1d",
            text: "Run a single-loop strategy: supply → borrow → swap → supply. Document every step, fee, and rate change",
            resource: "https://app.aave.com",
          },
          {
            id: "1e",
            text: "Read Aave governance forum — find 3 active proposals about risk parameters or incentives and understand what's being debated",
            resource: "https://governance.aave.com",
          },
          {
            id: "1f",
            text: "Study Aave's revenue model: how protocol fees, treasury, and DAO incentives interact with LP behaviour",
            resource: "https://tokenterminal.com/terminal/projects/aave",
          },
        ],
      },
      {
        week: 2,
        title: "Compound, Curve & Comparative Mechanics",
        tasks: [
          {
            id: "2a",
            text: "Supply to Compound v3 (Comet). Compare cToken mechanics to Aave's aTokens — note architectural differences and what they mean for LP risk",
            resource: "https://app.compound.finance",
          },
          {
            id: "2b",
            text: "Study Curve Finance: provide liquidity to a stablecoin pool. Understand the bonding curve and why it minimises slippage vs. Uniswap",
            resource: "https://curve.fi",
          },
          {
            id: "2c",
            text: "Read about Curve's gauge system and veCRV voting — this is how protocols compete for liquidity incentives (directly relevant to LP acquisition)",
            resource: "https://resources.curve.fi/governance/understanding-gauges/",
          },
          {
            id: "2d",
            text: "Provide liquidity on Uniswap v3 in a concentrated range. Track impermanent loss vs. fees earned",
            resource: "https://app.uniswap.org",
          },
          {
            id: "2e",
            text: "Write a 500-word personal note comparing Aave, Compound, and Curve from an LP's perspective — what would drive capital allocation to each?",
            resource: null,
          },
          {
            id: "2f",
            text: "Study one liquidation event on Aave using on-chain data — find a historical liquidation tx and reverse-engineer what happened to the health factor",
            resource: "https://etherscan.io",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Phase 2",
    title: "On-Chain Data Mastery",
    weeks: "Weeks 2–4",
    color: "#F5A623",
    bg: "#1F1800",
    icon: "📊",
    goal: "Build the ability to construct targeted LP outreach lists and understand capital flow patterns from on-chain data — the specific analytical requirement called out in the JD.",
    jdMap: "on-chain data & analytics · targeted outreach lists · capital flow patterns",
    weeks_data: [
      {
        week: 3,
        title: "Dune Analytics — Build Your First Dashboards",
        tasks: [
          {
            id: "3a",
            text: "Complete Dune's official SQL onboarding — learn to query decoded protocol tables (aave_v3.Supply, uniswap_v3.Swap, etc.)",
            resource: "https://dune.com/docs/learning/dune-analytics/tutorials/",
          },
          {
            id: "3b",
            text: "Dashboard 1: TVL inflows/outflows for one protocol over 90 days. Filter by wallet size (>$100k). Identify the top 20 depositors by address",
            resource: "https://dune.com",
          },
          {
            id: "3c",
            text: "Dashboard 2: Whale wallet movement — track wallets that moved >$500k into/out of Aave in the last 30 days. Label any you can identify",
            resource: "https://dune.com",
          },
          {
            id: "3d",
            text: "Dashboard 3: LP capital flow patterns — which pools are gaining TVL, from which wallet cohorts, and at what times?",
            resource: "https://dune.com",
          },
          {
            id: "3e",
            text: "Make one dashboard public on your Dune profile. This is a portfolio asset for interviews",
            resource: "https://dune.com",
          },
        ],
      },
      {
        week: 4,
        title: "Nansen, DeBank & LP Profiling",
        tasks: [
          {
            id: "4a",
            text: "Set up Nansen free trial. Study 'Smart Money' labels — understand which wallet cohorts they track and how they define institutional vs. retail behaviour",
            resource: "https://www.nansen.ai",
          },
          {
            id: "4b",
            text: "Use DeBank to profile 10 high-value wallets identified from your Dune dashboard. Understand their full DeFi portfolio positions",
            resource: "https://debank.com",
          },
          {
            id: "4c",
            text: "Use Arkham Intelligence to cross-reference wallets with known entity labels (funds, DAOs, protocols)",
            resource: "https://intel.arkm.com",
          },
          {
            id: "4d",
            text: "Build a manual LP target list: 20 wallets categorised as (a) institutional funds, (b) DAO treasuries, (c) on-chain whales — with current protocol allocation and estimated yield targets",
            resource: null,
          },
          {
            id: "4e",
            text: "Research Token Terminal and DeFiLlama as macro TVL intelligence sources — learn to read protocol revenue, fee generation, and LP incentive spend",
            resource: "https://tokenterminal.com",
          },
          {
            id: "4f",
            text: "Study one real DAO treasury: read their governance forum, treasury management reports, and current DeFi yield strategy (e.g., Uniswap, Arbitrum, MakerDAO)",
            resource: "https://forum.makerdao.com",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Phase 3",
    title: "Network & Community",
    weeks: "Weeks 3–6",
    color: "#7C5CBF",
    bg: "#120E1F",
    icon: "🌐",
    goal: "Build the DeFi-native network that your institutional BD background cannot substitute. Target: 3 meaningful conversations with DeFi treasury managers or DAO contributors by end of Week 6.",
    jdMap: "DeFi-native treasuries · institutional allocators · custodians · network",
    weeks_data: [
      {
        week: "3–4",
        title: "Governance Participation",
        tasks: [
          {
            id: "5a",
            text: "Create accounts on Aave, Uniswap, and Compound governance forums. Read the last 10 active proposals on each",
            resource: "https://governance.aave.com",
          },
          {
            id: "5b",
            text: "Post one substantive comment on an Aave or Uniswap governance proposal — frame it around capital efficiency or LP incentive design",
            resource: "https://gov.uniswap.org",
          },
          {
            id: "5c",
            text: "Follow 30 DeFi-native accounts on X/Twitter: protocol leads, DAO contributors, institutional crypto allocators, and DeFi researchers. Engage substantively",
            resource: "https://twitter.com",
          },
          {
            id: "5d",
            text: "Join Discord servers: Aave, Uniswap, Curve, and one institutional DeFi server (Bankless DAO, Index Coop). Participate in #governance or #treasury channels",
            resource: null,
          },
        ],
      },
      {
        week: "5–6",
        title: "Outreach & Events",
        tasks: [
          {
            id: "6a",
            text: "Identify 10 DeFi treasury managers whose governance forum activity you can reference. Send tailored outreach on LinkedIn or X — lead with a specific insight about their treasury strategy",
            resource: null,
          },
          {
            id: "6b",
            text: "Attend one DeFi-focused event or hackathon in person or online (ETHGlobal, DeFi conference track, or London Web3 meetup)",
            resource: "https://ethglobal.com",
          },
          {
            id: "6c",
            text: "Research Fireblocks, Copper, and Anchorage — the major institutional DeFi custody providers. Understand their LP onboarding flows",
            resource: "https://www.fireblocks.com",
          },
          {
            id: "6d",
            text: "Leverage existing TradFi network: identify 5 contacts from HSBC, MUFG, or Shell Energy now at crypto-adjacent institutions. Reconnect for intelligence on their DeFi allocation strategy",
            resource: null,
          },
          {
            id: "6e",
            text: "Use your Agentics Foundation community as a springboard — connect with any blockchain-native members in the London chapter",
            resource: "https://london.agentics.org",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Phase 4",
    title: "Thought Leadership",
    weeks: "Weeks 4–8",
    color: "#E84B3A",
    bg: "#200A08",
    icon: "✍️",
    goal: "Build a visible, practitioner-level DeFi content portfolio that signals fluency to hiring panels. 4 strong pieces beats 10 thin ones.",
    jdMap: "value proposition narrative · LP profile targeting · domain credibility",
    weeks_data: [
      {
        week: "4–5",
        title: "Content Creation — Articles",
        tasks: [
          {
            id: "7a",
            text: "Article 1: 'How DeFi Lending Protocols Compete for Institutional Liquidity — An Incentive Design Framework'. ~800 words on Medium. Draw on Phase 1 protocol experience",
            resource: "https://medium.com",
          },
          {
            id: "7b",
            text: "Article 2: 'On-Chain LP Profiling: Using Dune Analytics to Build a Targeted Capital Outreach List'. Walk through your dashboard methodology with screenshots — a direct portfolio piece",
            resource: "https://medium.com",
          },
          {
            id: "7c",
            text: "Article 3: 'What Institutional Allocators Need Before Entering DeFi — A TradFi-Native Perspective'. Your differentiator piece — write as someone who has lived on both sides",
            resource: "https://medium.com",
          },
        ],
      },
      {
        week: "6–8",
        title: "Profile & Portfolio Finalisation",
        tasks: [
          {
            id: "8a",
            text: "Update LinkedIn: add all DeFi certifications with Duke University attribution, DeFi & Web3 skills section, and link Medium articles + public Dune dashboards in Featured",
            resource: "https://linkedin.com",
          },
          {
            id: "8b",
            text: "Create GitHub repo 'defi-lp-intelligence' — publish Dune SQL queries, LP target list methodology, and any on-chain analysis scripts",
            resource: "https://github.com/mondweep",
          },
          {
            id: "8c",
            text: "Article 4: 'TVL Attribution in DeFi Growth — Building an LP Pipeline Framework from First Principles'. Interview prep in article form — forces you to systematise the core problem this role requires",
            resource: "https://medium.com",
          },
          {
            id: "8d",
            text: "Prepare 10-minute live interview walkthrough: open Aave app, walk through your position, explain health factor and loop strategy, then open Dune dashboard and narrate the LP flow analysis. Rehearse until fluent",
            resource: "https://app.aave.com",
          },
          {
            id: "8e",
            text: "Update CV 'Active Skill-Building' section — convert the forward-looking commitment to a backward-looking achievement list as each phase completes",
            resource: null,
          },
        ],
      },
    ],
  },
];

export const RESOURCES = [
  {
    category: "Protocol Interfaces",
    items: [
      {
        name: "Aave App",
        url: "https://app.aave.com",
        desc: "Primary lending protocol — supply, borrow, loop",
      },
      {
        name: "Aave Docs",
        url: "https://docs.aave.com",
        desc: "Risk parameters, aToken mechanics, governance",
      },
      {
        name: "Curve Finance",
        url: "https://curve.fi",
        desc: "Stablecoin AMM, gauge system, veCRV",
      },
      {
        name: "Uniswap App",
        url: "https://app.uniswap.org",
        desc: "Concentrated liquidity LP experience",
      },
      {
        name: "Compound v3",
        url: "https://app.compound.finance",
        desc: "Comet architecture, compare to Aave",
      },
    ],
  },
  {
    category: "On-Chain Data",
    items: [
      {
        name: "Dune Analytics",
        url: "https://dune.com",
        desc: "Build SQL dashboards on decoded protocol data",
      },
      {
        name: "Nansen",
        url: "https://www.nansen.ai",
        desc: "Smart Money labels, institutional wallet tracking",
      },
      {
        name: "DeBank",
        url: "https://debank.com",
        desc: "Full DeFi portfolio profiling per wallet",
      },
      {
        name: "DeFiLlama",
        url: "https://defillama.com",
        desc: "Protocol TVL, chain-level flows, yields",
      },
      {
        name: "Token Terminal",
        url: "https://tokenterminal.com",
        desc: "Protocol revenue, fee generation, LP incentive spend",
      },
      {
        name: "Arkham Intel",
        url: "https://intel.arkm.com",
        desc: "Entity labelling for institutional wallet identification",
      },
    ],
  },
  {
    category: "Community & Governance",
    items: [
      {
        name: "Aave Governance",
        url: "https://governance.aave.com",
        desc: "Active proposals on risk params & incentives",
      },
      {
        name: "Uniswap Forum",
        url: "https://gov.uniswap.org",
        desc: "Fee switch debates, liquidity incentive design",
      },
      {
        name: "MakerDAO Forum",
        url: "https://forum.makerdao.com",
        desc: "Study a real institutional-grade DAO treasury",
      },
      {
        name: "ETHGlobal Events",
        url: "https://ethglobal.com",
        desc: "Hackathons, DeFi track conferences",
      },
    ],
  },
  {
    category: "Reading & Research",
    items: [
      {
        name: "Aave Risk Docs",
        url: "https://docs.aave.com/risk/",
        desc: "Definitive source on aToken risk parameters",
      },
      {
        name: "Curve Resources",
        url: "https://resources.curve.fi",
        desc: "AMM design, gauge mechanics, veCRV system",
      },
      {
        name: "Bankless",
        url: "https://bankless.com",
        desc: "Institutional DeFi narrative, weekly deep dives",
      },
      {
        name: "The Defiant",
        url: "https://thedefiant.io",
        desc: "DeFi-native news and protocol analysis",
      },
      {
        name: "Delphi Digital",
        url: "https://delphidigital.io",
        desc: "Institutional-grade DeFi research reports",
      },
    ],
  },
];

export const STORAGE_KEY = "mondweep-defi-plan-v1";
export const CONSENT_KEY = "defi-learning-consent-v1";
