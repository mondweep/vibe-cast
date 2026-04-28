import { CourseLayout } from "@/components/layout/CourseLayout";
import { CheatsheetGallery, Cheatsheet } from "@/components/course/cheatsheet-gallery";

const CHEATSHEETS: Cheatsheet[] = [
  // Overview sheets (no module)
  {
    id: "overview",
    title: "Advanced Networking Overview",
    image: "/images/cheatsheets/advanced-networking-overview.png",
    moduleLabel: "Overview",
  },
  {
    id: "roadmap",
    title: "Curriculum Roadmap",
    image: "/images/cheatsheets/curriculum-roadmap.png",
    moduleLabel: "Roadmap",
  },
  // Per-module cheatsheets
  {
    id: "M01",
    title: "VPC Deep Dive",
    image: "/images/cheatsheets/M01/M01-vpc-deep-dive-cheatsheet.png",
    moduleSlug: "vpc-deep-dive",
    moduleLabel: "M01",
  },
  {
    id: "M02",
    title: "Hybrid Connectivity",
    image: "/images/cheatsheets/M02/M02-hybrid-connectivity-cheatsheet.png",
    moduleSlug: "hybrid-connectivity",
    moduleLabel: "M02",
  },
  {
    id: "M03",
    title: "Transit & PrivateLink",
    image: "/images/cheatsheets/M03/M03-transit-and-privatelink-cheatsheet.png",
    moduleSlug: "transit-and-privatelink",
    moduleLabel: "M03",
  },
  {
    id: "M04",
    title: "DNS & Route 53",
    image: "/images/cheatsheets/M04/M04-dns-and-route53-cheatsheet.png",
    moduleSlug: "dns-and-route53",
    moduleLabel: "M04",
  },
  {
    id: "M05",
    title: "Load Balancing & CDN",
    image: "/images/cheatsheets/M05/M05-load-balancing-and-cdn-cheatsheet.png",
    moduleSlug: "load-balancing-and-cdn",
    moduleLabel: "M05",
  },
  {
    id: "M06",
    title: "Network Security",
    image: "/images/cheatsheets/M06/M06-network-security-cheatsheet.png",
    moduleSlug: "network-security",
    moduleLabel: "M06",
  },
  {
    id: "M07",
    title: "Monitoring & Troubleshooting",
    image: "/images/cheatsheets/M07/M07-monitoring-and-troubleshooting-cheatsheet.png",
    moduleSlug: "monitoring-and-troubleshooting",
    moduleLabel: "M07",
  },
  {
    id: "M08",
    title: "Network Automation",
    image: "/images/cheatsheets/M08/M08-network-automation-cheatsheet.png",
    moduleSlug: "network-automation",
    moduleLabel: "M08",
  },
  {
    id: "M09",
    title: "Multi-Account Architecture",
    image: "/images/cheatsheets/M09/M09-multi-account-architecture-cheatsheet.png",
    moduleSlug: "multi-account-architecture",
    moduleLabel: "M09",
  },
  {
    id: "M10",
    title: "BGP & Exam Mastery",
    image: "/images/cheatsheets/M10/M10-bgp-and-exam-mastery-cheatsheet.png",
    moduleSlug: "bgp-and-exam-mastery",
    moduleLabel: "M10",
  },
];

export default function CheatsheetsPage() {
  return (
    <CourseLayout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Cheatsheets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quick-reference visual summaries for all 10 modules. Click any card to open full-screen — use ← → to navigate, Esc to close.
          </p>
          <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground font-mono">
            <span>📄 {CHEATSHEETS.length} cheatsheets</span>
            <span>·</span>
            <span>🖼 Click to zoom</span>
            <span>·</span>
            <span>⬇ Download via Full size ↗</span>
          </div>
        </div>

        {/* Gallery */}
        <CheatsheetGallery cheatsheets={CHEATSHEETS} />
      </div>
    </CourseLayout>
  );
}
