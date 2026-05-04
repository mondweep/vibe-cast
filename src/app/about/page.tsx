export default function About() {
  return (
    <div
      style={{
        backgroundColor: "#0A0E14",
        color: "#E0E6ED",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          lineHeight: 1.8,
          fontSize: 14,
        }}
      >
        <div
          style={{
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 32,
              marginBottom: 10,
            }}
          >
            About This Project
          </h1>
          <p style={{ color: "#8A92A0", fontSize: 12 }}>
            DeFi Learning Journey — An 8-week intensive curriculum
          </p>
        </div>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            What This Is
          </h2>
          <p>
            This app is a structured, personal learning journey into DeFi. It
            takes you from protocol fundamentals (Aave, Compound, Curve) through
            on-chain data analysis (Dune, Nansen, DeBank) and into network
            building and thought leadership.
          </p>
          <p style={{ marginTop: 10 }}>
            The curriculum is designed around a real job description: acquiring
            institutional liquidity for a DeFi protocol. By the end of 8 weeks,
            you'll have hands-on experience with live protocols, on-chain
            analytics dashboards, and a curated network of DeFi-native contacts.
          </p>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            The 4 Phases
          </h2>
          <div style={{ marginLeft: 20 }}>
            <p style={{ marginBottom: 15 }}>
              <strong style={{ color: "#00C2CB" }}>Phase 1: Protocol Immersion</strong>
              <br />
              Weeks 1–2. Supply, borrow, and loop on live Aave. Compare Compound and
              Curve. Understand risk parameters and LP incentive mechanics.
            </p>
            <p style={{ marginBottom: 15 }}>
              <strong style={{ color: "#F5A623" }}>Phase 2: On-Chain Data Mastery</strong>
              <br />
              Weeks 2–4. Build Dune dashboards. Profile wallets with Nansen and
              DeBank. Create a targeted LP outreach list from on-chain data.
            </p>
            <p style={{ marginBottom: 15 }}>
              <strong style={{ color: "#7C5CBF" }}>Phase 3: Network & Community</strong>
              <br />
              Weeks 3–6. Participate in governance forums. Attend DeFi events.
              Make 3 meaningful conversations with DAO treasurers or allocators.
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong style={{ color: "#E84B3A" }}>Phase 4: Thought Leadership</strong>
              <br />
              Weeks 4–8. Write 4 articles on Medium. Publish Dune dashboards.
              Build a public portfolio that signals fluency to hiring panels.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            The AI Tutor
          </h2>
          <p>
            Every question you ask is answered with the full curriculum as
            context. The tutor knows about all 42 tasks, every resource link,
            and the underlying learning outcomes. It's specialized to your
            journey, not a generic chatbot.
          </p>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            Built With
          </h2>
          <ul style={{ marginLeft: 20 }}>
            <li>
              <strong>Next.js 14</strong> — React framework with App Router
            </li>
            <li>
              <strong>TypeScript</strong> — Type-safe components and APIs
            </li>
            <li>
              <strong>Anthropic Claude API</strong> — AI tutor engine
            </li>
            <li>
              <strong>Supabase</strong> — Optional cloud sync
            </li>
            <li>
              <strong>IBM Plex Mono + Libre Baskerville</strong> — Typography
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            For Developers
          </h2>
          <p>
            This is an open-source learning project. Fork it, customize it for
            your own journey, or contribute improvements.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>GitHub:</strong>{" "}
            <a
              href="https://github.com/mondweep/vibe-cast/blob/claude/create-defi-orphan-branch-MwFdJ/README.md"
              style={{
                color: "#00C2CB",
                textDecoration: "underline",
              }}
            >
              mondweep/vibe-cast
            </a>
          </p>
          <p style={{ marginTop: 10 }}>
            The codebase is structured for easy customization:
          </p>
          <ul style={{ marginLeft: 20, marginTop: 10 }}>
            <li>Edit phases and tasks in <code>src/lib/constants.ts</code></li>
            <li>Customize colors and styling in component files</li>
            <li>Extend the AI tutor context in <code>src/app/api/chat/route.ts</code></li>
            <li>Deploy to Vercel or Netlify in minutes</li>
          </ul>
        </section>

        <section style={{ marginBottom: 30 }}>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 20,
              marginBottom: 15,
              color: "#00C2CB",
            }}
          >
            Creator
          </h2>
          <p>
            Built by someone transitioning from traditional finance into DeFi.
            This app is the learning structure they wished existed.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Connect:</strong>{" "}
            <a
              href="https://www.linkedin.com/in/mondweepchakravorty/"
              style={{
                color: "#00C2CB",
                textDecoration: "underline",
              }}
            >
              LinkedIn
            </a>
          </p>
        </section>

        <div
          style={{
            marginTop: 50,
            paddingTop: 20,
            borderTop: "1px solid #1A1F2E",
            textAlign: "center",
          }}
        >
          <a
            href="/"
            style={{
              color: "#00C2CB",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Back to Learning
          </a>
        </div>
      </div>
    </div>
  );
}
