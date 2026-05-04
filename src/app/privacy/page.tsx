export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p style={{ color: "#8A92A0", fontSize: 12 }}>
            Last updated: {new Date().toISOString().split("T")[0]}
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
            Overview
          </h2>
          <p>
            This Privacy Policy describes how the DeFi Learning Journey app
            ("the App") collects, uses, and protects your personal information.
            The App is a personal learning tool designed to track your DeFi
            education progress and provide AI-powered tutoring.
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
            Data We Collect
          </h2>
          <ul style={{ marginLeft: 20 }}>
            <li style={{ marginBottom: 10 }}>
              <strong>Learning Progress:</strong> Your task completion status,
              notes, and phase advancement
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>Chat History:</strong> Questions and answers from the AI
              tutor (if you use that feature)
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>Usage Analytics:</strong> Non-identifying patterns about
              which phases and resources you access
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
            How We Store Data
          </h2>
          <p style={{ marginBottom: 10 }}>
            <strong>Local Storage (Primary):</strong> Your progress is stored
            locally in your browser. You maintain full control and can clear
            this data anytime.
          </p>
          <p style={{ marginBottom: 10 }}>
            <strong>Cloud Backup (Optional):</strong> If you connect a Supabase
            instance (requires your own credentials), progress syncs to your
            account only. We do not host shared infrastructure.
          </p>
          <p>
            <strong>API Requests:</strong> Chat with the AI tutor sends encrypted
            requests to Anthropic's Claude API. Your questions are processed
            according to Anthropic's privacy policy.
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
            Third Parties
          </h2>
          <p>
            The App integrates with third-party services that you control:
          </p>
          <ul style={{ marginLeft: 20, marginTop: 10 }}>
            <li>
              <strong>Supabase:</strong> Optional cloud sync (you provide
              credentials)
            </li>
            <li>
              <strong>Anthropic Claude API:</strong> AI tutor (you provide API
              key)
            </li>
          </ul>
          <p style={{ marginTop: 10 }}>
            We do not sell, trade, or share your data with other organizations.
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
            Your Rights
          </h2>
          <ul style={{ marginLeft: 20 }}>
            <li>
              <strong>Access:</strong> View all your data in the App anytime
            </li>
            <li>
              <strong>Deletion:</strong> Clear your progress by clearing browser
              storage or requesting Supabase deletion
            </li>
            <li>
              <strong>Portability:</strong> Export your learning data for use
              elsewhere
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
            Contact
          </h2>
          <p>
            Questions about privacy? Contact:{" "}
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
