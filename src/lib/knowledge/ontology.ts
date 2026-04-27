// ── AWS Advanced Networking Course — Domain Ontology ─────────
// This defines the controlled vocabulary (entity types + relation
// types) for the knowledge graph. Follows the ADR-007 DDD approach.

export type NodeType =
  | "AWSService"   // AWS product e.g. Transit Gateway
  | "Concept"      // Networking concept e.g. BGP, CIDR
  | "Protocol"     // Network protocol e.g. TCP, BGP, OSPF
  | "Pattern"      // Architecture pattern e.g. Hub-Spoke
  | "ExamTopic"    // ANS-C01 exam domain topic
  | "Module"       // Course module
  | "Lesson";      // Course lesson/section

export type RelationType =
  | "USES"           // A uses B to function
  | "REQUIRES"       // A requires B as prerequisite
  | "ENABLES"        // A enables/unlocks B
  | "COMPARED_TO"    // A is commonly compared to B
  | "PART_OF"        // A is a component of B
  | "PREREQUISITE_OF"// A must be understood before B
  | "APPEARS_IN"     // A topic appears in B module
  | "ALTERNATIVE_TO" // A is an alternative to B
  | "CONFIGURES"     // A configures/controls B
  | "SECURES"        // A provides security for B
  | "MONITORS";      // A monitors B

export interface KGNode {
  label: string;
  type: NodeType;
  description: string;
  module_ids: string[];
  properties?: Record<string, unknown>;
}

export interface KGEdge {
  from: string;   // Node label
  to: string;     // Node label
  relation: RelationType;
  weight?: number;
  properties?: Record<string, unknown>;
}

// ── NODES: AWS Services ───────────────────────────────────────
export const NODES: KGNode[] = [
  // AWS Services
  { label: "VPC", type: "AWSService", description: "Virtual Private Cloud — isolated network in AWS", module_ids: ["01","03","05","06","09"] },
  { label: "Transit Gateway", type: "AWSService", description: "Regional network hub connecting VPCs and on-premises at scale", module_ids: ["01","03","09"] },
  { label: "Direct Connect", type: "AWSService", description: "Dedicated private network connection between on-premises and AWS", module_ids: ["02","09"] },
  { label: "Direct Connect Gateway", type: "AWSService", description: "Enables one DX connection to reach multiple regions and VPCs", module_ids: ["02","09"] },
  { label: "Virtual Private Gateway", type: "AWSService", description: "VPN concentrator on the AWS side of a Site-to-Site VPN", module_ids: ["02"] },
  { label: "Site-to-Site VPN", type: "AWSService", description: "Encrypted IPSec VPN over the public internet to AWS", module_ids: ["02"] },
  { label: "Route 53", type: "AWSService", description: "AWS DNS service with traffic routing policies and health checks", module_ids: ["04"] },
  { label: "Route 53 Resolver", type: "AWSService", description: "DNS resolver enabling hybrid resolution between AWS and on-premises", module_ids: ["04"] },
  { label: "Application Load Balancer", type: "AWSService", description: "Layer 7 load balancer supporting HTTP/HTTPS, content routing, and WAF", module_ids: ["05"] },
  { label: "Network Load Balancer", type: "AWSService", description: "Layer 4 load balancer for ultra-low latency and static IPs", module_ids: ["05"] },
  { label: "Gateway Load Balancer", type: "AWSService", description: "Transparent Layer 3 load balancer for inline network appliances", module_ids: ["05","06"] },
  { label: "CloudFront", type: "AWSService", description: "Global CDN with 450+ edge locations for content caching and delivery", module_ids: ["05"] },
  { label: "Global Accelerator", type: "AWSService", description: "Network-layer acceleration using AWS backbone and anycast IPs", module_ids: ["05"] },
  { label: "Network Firewall", type: "AWSService", description: "Managed stateful firewall with Suricata IDS/IPS rules", module_ids: ["06"] },
  { label: "AWS WAF", type: "AWSService", description: "Layer 7 web application firewall for ALB, CloudFront and API GW", module_ids: ["06"] },
  { label: "AWS Shield", type: "AWSService", description: "DDoS protection service with Standard (free) and Advanced tiers", module_ids: ["06"] },
  { label: "VPC Flow Logs", type: "AWSService", description: "Captures IP traffic metadata at ENI, subnet or VPC level", module_ids: ["07"] },
  { label: "Reachability Analyzer", type: "AWSService", description: "Configuration-level network path analysis without sending traffic", module_ids: ["07"] },
  { label: "Network Access Analyzer", type: "AWSService", description: "Finds unintended network access paths for compliance auditing", module_ids: ["07"] },
  { label: "AWS Config", type: "AWSService", description: "Configuration compliance monitoring for AWS resources", module_ids: ["08"] },
  { label: "CloudFormation", type: "AWSService", description: "Infrastructure as Code — declarative AWS resource provisioning", module_ids: ["08"] },
  { label: "CDK", type: "AWSService", description: "Cloud Development Kit — imperative IaC using TypeScript/Python/Java", module_ids: ["08"] },
  { label: "AWS Organizations", type: "AWSService", description: "Multi-account management with SCPs and consolidated billing", module_ids: ["09"] },
  { label: "Resource Access Manager", type: "AWSService", description: "Share AWS resources (TGW, subnets, Route 53 rules) across accounts", module_ids: ["09"] },
  { label: "VPC Endpoint", type: "AWSService", description: "Private connectivity to AWS services without internet traversal", module_ids: ["01","03"] },
  { label: "PrivateLink", type: "AWSService", description: "One-way private service access via ENI in consumer VPC", module_ids: ["03"] },
  { label: "NAT Gateway", type: "AWSService", description: "Managed NAT for private subnet internet egress", module_ids: ["01"] },

  // Concepts
  { label: "BGP", type: "Concept", description: "Border Gateway Protocol — routing protocol used by Direct Connect and internet", module_ids: ["02","10"] },
  { label: "CIDR", type: "Concept", description: "Classless Inter-Domain Routing — IP address range notation", module_ids: ["01","09"] },
  { label: "Subnet", type: "Concept", description: "AZ-scoped subdivision of a VPC CIDR block", module_ids: ["01"] },
  { label: "Route Table", type: "Concept", description: "Set of rules controlling where network traffic is directed", module_ids: ["01","03"] },
  { label: "Security Group", type: "Concept", description: "Stateful virtual firewall at the ENI level", module_ids: ["06"] },
  { label: "NACL", type: "Concept", description: "Stateless subnet-level access control list", module_ids: ["06"] },
  { label: "AS_PATH", type: "Concept", description: "BGP attribute listing ASes a route has passed through; shorter = preferred", module_ids: ["02","10"] },
  { label: "Local Preference", type: "Concept", description: "BGP iBGP attribute; higher value = preferred outbound path", module_ids: ["02","10"] },
  { label: "MED", type: "Concept", description: "Multi-Exit Discriminator — BGP attribute; lower = preferred entry point", module_ids: ["02","10"] },
  { label: "BGP Communities", type: "Concept", description: "Tags on BGP routes to influence path selection across ASes", module_ids: ["10"] },
  { label: "IPv6", type: "Concept", description: "128-bit addressing; no NAT required; Egress-Only IGW for outbound-only", module_ids: ["09"] },
  { label: "Longest Prefix Match", type: "Concept", description: "AWS routing rule: most specific route wins", module_ids: ["01"] },
  { label: "DNS", type: "Concept", description: "Domain Name System — translates hostnames to IP addresses", module_ids: ["04"] },
  { label: "DNSSEC", type: "Concept", description: "Cryptographic signing of DNS records to prevent spoofing", module_ids: ["04"] },
  { label: "Health Check", type: "Concept", description: "Automated endpoint monitoring for failover and routing decisions", module_ids: ["04","05"] },
  { label: "TLS Termination", type: "Concept", description: "Decryption of TLS at load balancer, forwarding plain HTTP to targets", module_ids: ["05"] },
  { label: "Anycast", type: "Concept", description: "IP routing where packets go to the nearest of multiple endpoints", module_ids: ["05"] },
  { label: "DDoS", type: "Concept", description: "Distributed Denial of Service attack flooding a target with traffic", module_ids: ["06"] },

  // Patterns
  { label: "Hub-Spoke", type: "Pattern", description: "Central hub (TGW/VPC) connecting multiple spoke VPCs — no direct spoke-to-spoke routing without hub", module_ids: ["03","09"] },
  { label: "Centralised Egress", type: "Pattern", description: "All internet-bound traffic routed through single inspection/NAT VPC via TGW", module_ids: ["03","06"] },
  { label: "Centralised Inspection", type: "Pattern", description: "East-west traffic inspected by a Network Firewall in a dedicated VPC", module_ids: ["03","06"] },
  { label: "Defence in Depth", type: "Pattern", description: "Layered security: WAF → Shield → ALB → SG → Network Firewall → NACL", module_ids: ["06"] },
  { label: "Split-Horizon DNS", type: "Pattern", description: "Same domain resolves to private IPs inside VPC, public IPs externally", module_ids: ["04"] },
  { label: "Active-Passive Failover", type: "Pattern", description: "Primary resource serves traffic; secondary takes over on health check failure", module_ids: ["04","05"] },
  { label: "VPC Sharing", type: "Pattern", description: "Network account owns VPC; workload accounts deploy into shared subnets via RAM", module_ids: ["09"] },

  // Exam Topics
  { label: "ANS-C01", type: "ExamTopic", description: "AWS Advanced Networking Specialty certification exam", module_ids: ["10"] },
  { label: "BGP Path Selection", type: "ExamTopic", description: "9-step BGP algorithm — Weight, LocalPref, AS_PATH, Origin, MED, eBGP/iBGP, IGP metric, Router ID", module_ids: ["10"] },
  { label: "DX Redundancy Models", type: "ExamTopic", description: "Non-redundant, High (99.9%), Maximum (99.99%), SiteLink patterns", module_ids: ["02","10"] },
  { label: "VPC Peering vs TGW", type: "ExamTopic", description: "Non-transitive vs transitive routing; when to use each", module_ids: ["01","10"] },
  { label: "SG vs NACL", type: "ExamTopic", description: "Stateful vs stateless; instance vs subnet; allow-only vs allow+deny", module_ids: ["06","10"] },

  // Modules
  { label: "M01 VPC Deep Dive",              type: "Module", description: "VPC fundamentals: CIDR, subnets, routing, peering vs TGW, endpoints", module_ids: ["01"] },
  { label: "M02 Hybrid Connectivity",        type: "Module", description: "Direct Connect, BGP, VPN, redundancy models, CloudHub", module_ids: ["02"] },
  { label: "M03 Transit & PrivateLink",       type: "Module", description: "TGW route tables, centralised egress/inspection, PrivateLink, GWLBE", module_ids: ["03"] },
  { label: "M04 DNS & Route 53",             type: "Module", description: "7 routing policies, health checks, PHZ, Resolver, DNSSEC", module_ids: ["04"] },
  { label: "M05 Load Balancing & CDN",       type: "Module", description: "ALB vs NLB vs GWLB, CloudFront, Global Accelerator", module_ids: ["05"] },
  { label: "M06 Network Security",           type: "Module", description: "SGs vs NACLs, Network Firewall, WAF, Shield, defence-in-depth", module_ids: ["06"] },
  { label: "M07 Monitoring",                 type: "Module", description: "VPC Flow Logs, Reachability Analyzer, CloudWatch networking metrics", module_ids: ["07"] },
  { label: "M08 Automation",                 type: "Module", description: "CloudFormation, CDK, event-driven remediation, Config rules", module_ids: ["08"] },
  { label: "M09 Multi-Account Architecture", type: "Module", description: "Organizations, RAM, TGW multi-account, IPv6 at scale, VPC sharing", module_ids: ["09"] },
  { label: "M10 BGP & Exam Mastery",         type: "Module", description: "Full BGP algorithm, communities, MED, ANS-C01 exam strategy", module_ids: ["10"] },
];

// ── EDGES: Ontological relationships ─────────────────────────
export const EDGES: KGEdge[] = [
  // VPC relationships
  { from: "VPC", to: "Subnet", relation: "PART_OF", weight: 1.0 },
  { from: "VPC", to: "Route Table", relation: "PART_OF", weight: 1.0 },
  { from: "VPC", to: "Security Group", relation: "PART_OF", weight: 1.0 },
  { from: "VPC", to: "NAT Gateway", relation: "USES", weight: 0.9 },
  { from: "VPC", to: "VPC Endpoint", relation: "USES", weight: 0.8 },
  { from: "VPC", to: "PrivateLink", relation: "USES", weight: 0.8 },
  { from: "VPC", to: "Transit Gateway", relation: "COMPARED_TO", weight: 0.8 },
  { from: "Route Table", to: "Longest Prefix Match", relation: "USES", weight: 1.0 },

  // Transit Gateway
  { from: "Transit Gateway", to: "Direct Connect Gateway", relation: "USES", weight: 1.0 },
  { from: "Transit Gateway", to: "Route Table", relation: "USES", weight: 1.0 },
  { from: "Transit Gateway", to: "Hub-Spoke", relation: "ENABLES", weight: 1.0 },
  { from: "Transit Gateway", to: "Centralised Egress", relation: "ENABLES", weight: 0.9 },
  { from: "Transit Gateway", to: "Centralised Inspection", relation: "ENABLES", weight: 0.9 },
  { from: "Transit Gateway", to: "VPC", relation: "COMPARED_TO", weight: 0.8 },

  // Direct Connect
  { from: "Direct Connect", to: "BGP", relation: "USES", weight: 1.0 },
  { from: "Direct Connect", to: "Direct Connect Gateway", relation: "USES", weight: 1.0 },
  { from: "Direct Connect", to: "Virtual Private Gateway", relation: "COMPARED_TO", weight: 0.7 },
  { from: "Direct Connect", to: "Site-to-Site VPN", relation: "COMPARED_TO", weight: 0.9 },
  { from: "Direct Connect", to: "DX Redundancy Models", relation: "PART_OF", weight: 1.0 },
  { from: "Direct Connect Gateway", to: "Transit Gateway", relation: "CONFIGURES", weight: 1.0 },

  // BGP
  { from: "BGP", to: "AS_PATH", relation: "USES", weight: 1.0 },
  { from: "BGP", to: "Local Preference", relation: "USES", weight: 1.0 },
  { from: "BGP", to: "MED", relation: "USES", weight: 1.0 },
  { from: "BGP", to: "BGP Communities", relation: "USES", weight: 0.9 },
  { from: "BGP", to: "BGP Path Selection", relation: "PART_OF", weight: 1.0 },
  { from: "AS_PATH", to: "BGP Path Selection", relation: "PART_OF", weight: 1.0 },
  { from: "Local Preference", to: "BGP Path Selection", relation: "PART_OF", weight: 1.0 },
  { from: "MED", to: "BGP Path Selection", relation: "PART_OF", weight: 1.0 },

  // Route 53
  { from: "Route 53", to: "DNS", relation: "USES", weight: 1.0 },
  { from: "Route 53", to: "Health Check", relation: "USES", weight: 1.0 },
  { from: "Route 53", to: "DNSSEC", relation: "ENABLES", weight: 0.9 },
  { from: "Route 53", to: "Active-Passive Failover", relation: "ENABLES", weight: 0.9 },
  { from: "Route 53", to: "Split-Horizon DNS", relation: "ENABLES", weight: 0.8 },
  { from: "Route 53 Resolver", to: "Route 53", relation: "PART_OF", weight: 1.0 },
  { from: "Route 53 Resolver", to: "DNS", relation: "USES", weight: 1.0 },

  // Load balancing
  { from: "Application Load Balancer", to: "TLS Termination", relation: "ENABLES", weight: 1.0 },
  { from: "Application Load Balancer", to: "AWS WAF", relation: "USES", weight: 0.9 },
  { from: "Application Load Balancer", to: "Network Load Balancer", relation: "COMPARED_TO", weight: 1.0 },
  { from: "Network Load Balancer", to: "PrivateLink", relation: "ENABLES", weight: 1.0 },
  { from: "Network Load Balancer", to: "Anycast", relation: "COMPARED_TO", weight: 0.6 },
  { from: "Gateway Load Balancer", to: "Network Firewall", relation: "COMPARED_TO", weight: 0.7 },
  { from: "Gateway Load Balancer", to: "Centralised Inspection", relation: "ENABLES", weight: 0.9 },
  { from: "CloudFront", to: "AWS WAF", relation: "USES", weight: 0.9 },
  { from: "CloudFront", to: "AWS Shield", relation: "USES", weight: 0.9 },
  { from: "Global Accelerator", to: "Anycast", relation: "USES", weight: 1.0 },
  { from: "Global Accelerator", to: "CloudFront", relation: "COMPARED_TO", weight: 0.9 },

  // Security
  { from: "Network Firewall", to: "Centralised Inspection", relation: "ENABLES", weight: 1.0 },
  { from: "Network Firewall", to: "Defence in Depth", relation: "PART_OF", weight: 0.9 },
  { from: "AWS WAF", to: "Defence in Depth", relation: "PART_OF", weight: 0.9 },
  { from: "AWS Shield", to: "DDoS", relation: "SECURES", weight: 1.0 },
  { from: "AWS Shield", to: "Defence in Depth", relation: "PART_OF", weight: 0.8 },
  { from: "Security Group", to: "NACL", relation: "COMPARED_TO", weight: 1.0 },
  { from: "Security Group", to: "SG vs NACL", relation: "PART_OF", weight: 1.0 },
  { from: "NACL", to: "SG vs NACL", relation: "PART_OF", weight: 1.0 },
  { from: "Security Group", to: "Defence in Depth", relation: "PART_OF", weight: 0.8 },

  // Monitoring
  { from: "VPC Flow Logs", to: "VPC", relation: "MONITORS", weight: 1.0 },
  { from: "Reachability Analyzer", to: "VPC", relation: "MONITORS", weight: 1.0 },
  { from: "Network Access Analyzer", to: "Reachability Analyzer", relation: "COMPARED_TO", weight: 0.8 },

  // Automation
  { from: "CDK", to: "CloudFormation", relation: "USES", weight: 1.0 },
  { from: "AWS Config", to: "CloudFormation", relation: "MONITORS", weight: 0.7 },

  // Multi-account
  { from: "AWS Organizations", to: "Resource Access Manager", relation: "ENABLES", weight: 0.9 },
  { from: "Resource Access Manager", to: "Transit Gateway", relation: "CONFIGURES", weight: 0.9 },
  { from: "Resource Access Manager", to: "VPC Sharing", relation: "ENABLES", weight: 1.0 },
  { from: "IPv6", to: "VPC", relation: "CONFIGURES", weight: 0.8 },

  // Module prerequisites (learning order)
  { from: "M01 VPC Deep Dive", to: "M02 Hybrid Connectivity", relation: "PREREQUISITE_OF", weight: 0.9 },
  { from: "M01 VPC Deep Dive", to: "M03 Transit & PrivateLink", relation: "PREREQUISITE_OF", weight: 1.0 },
  { from: "M01 VPC Deep Dive", to: "M04 DNS & Route 53", relation: "PREREQUISITE_OF", weight: 0.8 },
  { from: "M01 VPC Deep Dive", to: "M05 Load Balancing & CDN", relation: "PREREQUISITE_OF", weight: 0.8 },
  { from: "M01 VPC Deep Dive", to: "M06 Network Security", relation: "PREREQUISITE_OF", weight: 1.0 },
  { from: "M02 Hybrid Connectivity", to: "M09 Multi-Account Architecture", relation: "PREREQUISITE_OF", weight: 0.7 },
  { from: "M02 Hybrid Connectivity", to: "M10 BGP & Exam Mastery", relation: "PREREQUISITE_OF", weight: 0.9 },
  { from: "M03 Transit & PrivateLink", to: "M09 Multi-Account Architecture", relation: "PREREQUISITE_OF", weight: 0.8 },
  { from: "M09 Multi-Account Architecture", to: "M10 BGP & Exam Mastery", relation: "PREREQUISITE_OF", weight: 0.7 },

  // Exam topics appear in modules
  { from: "ANS-C01", to: "BGP Path Selection", relation: "PART_OF", weight: 1.0 },
  { from: "ANS-C01", to: "DX Redundancy Models", relation: "PART_OF", weight: 1.0 },
  { from: "ANS-C01", to: "VPC Peering vs TGW", relation: "PART_OF", weight: 1.0 },
  { from: "ANS-C01", to: "SG vs NACL", relation: "PART_OF", weight: 1.0 },
];
