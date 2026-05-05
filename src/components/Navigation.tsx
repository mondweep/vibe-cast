import Link from "next/link";

export function Navigation() {
  return (
    <nav
      style={{
        background: "linear-gradient(135deg,#0D1A26,#0A1520)",
        borderBottom: "1px solid #1C2E3E",
        padding: "12px 30px",
        display: "flex",
        gap: "24px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "12px",
        letterSpacing: "0.1em",
      }}
    >
      <Link href="/" style={{ color: "#C8D6E5", textDecoration: "none" }}>
        LEARNING PLAN
      </Link>
      <Link href="/tutor" style={{ color: "#C8D6E5", textDecoration: "none" }}>
        AI TUTOR
      </Link>
      <Link href="/about" style={{ color: "#C8D6E5", textDecoration: "none" }}>
        ABOUT
      </Link>
      <Link href="/privacy" style={{ color: "#C8D6E5", textDecoration: "none" }}>
        PRIVACY
      </Link>
    </nav>
  );
}
