# Semantic Graph: Assam AI Governance Initiatives

> Machine-readable knowledge graph with Mermaid diagrams and Neo4j Cypher exports

---

## Summary

This PRD outlines two AI governance initiatives for Assam State Government: a Property Registration Digitalization App to streamline property transactions through AI-assisted document verification, and an Infrastructure Cost Auditing System to detect and prevent cost inflation in public works projects. Together, these systems aim to reduce corruption, increase transparency, and save ₹50+ crore annually while cutting processing times by 60%+.

---

## Key Concepts

- **AI Document Verification** — OCR-powered document classification and entity extraction for property registration
- **Anomaly Detection** — ML-based flagging of inflated cost estimates against historical baselines
- **Digital Governance** — End-to-end digitalization of government processes with audit trails
- **Cost Baseline Model** — Historical median cost calculations adjusted for location, terrain, and market rates
- **Role-Based Access Control** — Security architecture ensuring data privacy and compliance
- **Explainable AI** — Transparent reasoning for flagged estimates enabling appeals and accountability

---

## Core Arguments

1. **Manual processes enable corruption**: Paper-based workflows with multiple office visits create opportunities for fraud and inefficiency in both property registration and infrastructure contracting.

2. **AI can validate at scale**: Machine learning models trained on historical data can automatically flag anomalies that would escape manual review, catching 80%+ of suspicious estimates.

3. **Transparency drives accountability**: Complete audit trails and explainable AI decisions allow for appeals while ensuring every decision is logged and traceable.

4. **ROI justifies investment**: At ₹3.2 crore total cost versus ₹50+ crore annual savings, the payback period is approximately 2 months.

5. **Phased rollout reduces risk**: Starting with flat registration and road construction (highest fraud vectors) allows validation before expanding to other domains.

6. **Human-in-the-loop preserves fairness**: AI flags anomalies but humans make final approval decisions, with grievance mechanisms for engineers.

---

## Key Quotes

> "Real example: ₹2 crore project → ₹6-7 crore estimate (3x markup)"

> "Citizens must visit government offices to register property transactions... Average processing time: 20-30 days"

> "AI makes final flagging, humans make approval decisions"

> "Payback period: ~2 months"

---

## Mermaid Diagrams

### System Architecture Overview

```mermaid
flowchart TB
    subgraph Citizens
        C[Citizen User]
    end

    subgraph PropertyApp["Property Registration App"]
        PA1[Digital Application]
        PA2[AI Document Verification]
        PA3[Status Dashboard]
        PA4[Digital Signature]
    end

    subgraph CostAudit["Cost Auditing System"]
        CA1[Estimate Intake]
        CA2[AI Anomaly Detection]
        CA3[Approval Workflow]
        CA4[Audit Trail]
    end

    subgraph DataSources["Government Data Sources"]
        DS1[Property Registry]
        DS2[Tax Records]
        DS3[Historical Projects]
        DS4[Material Prices]
    end

    subgraph Engineers
        E[PWD Engineers]
    end

    C --> PA1
    PA1 --> PA2
    PA2 --> PA3
    PA3 --> PA4

    E --> CA1
    CA1 --> CA2
    CA2 --> CA3
    CA3 --> CA4

    DS1 --> PA2
    DS2 --> PA2
    DS3 --> CA2
    DS4 --> CA2
```

### Estimate Approval Workflow

```mermaid
flowchart LR
    Submit[Engineer Submits Estimate] --> Score[AI Calculates Score]
    Score --> Green{Score < 1.2x?}
    Green -->|Yes| AutoApprove[Auto-Approve]
    Green -->|No| Yellow{Score < 1.5x?}
    Yellow -->|Yes| SupervisorReview[Supervisor Review]
    Yellow -->|No| Red[Executive Sign-off + Investigation]
    SupervisorReview --> Decision1{Approved?}
    Decision1 -->|Yes| Approved[Project Approved]
    Decision1 -->|No| Rejected[Estimate Rejected]
    Red --> Decision2{Approved?}
    Decision2 -->|Yes| Approved
    Decision2 -->|No| Rejected
    AutoApprove --> Approved
```

### Data Flow Mindmap

```mermaid
mindmap
  root((Assam AI Governance))
    Property Registration
      Document Upload
        Deed
        Tax Receipts
        ID Proofs
      AI Verification
        OCR Processing
        Cross-Reference
        Anomaly Flagging
      Output
        Digital Certificate
        Audit Log
    Cost Auditing
      Historical Data
        5+ Years Projects
        Material Prices
        Labor Rates
      Estimate Analysis
        Baseline Calculation
        Confidence Intervals
        Risk Classification
      Approval Workflow
        Green Auto-Approve
        Yellow Supervisor
        Red Executive
```

### Entity Relationship Diagram

```mermaid
erDiagram
    PROJECT ||--o{ ESTIMATE : has
    ESTIMATE ||--o{ APPROVAL : requires
    ENGINEER ||--o{ ESTIMATE : submits
    ESTIMATE ||--|| AI_SCORE : generates
    AI_SCORE ||--o{ FLAG : triggers
    HISTORICAL_DATA ||--o{ BASELINE : informs
    BASELINE ||--|| AI_SCORE : compares

    PROJECT {
        string id
        string name
        string type
        float length_km
        float actual_cost
        date completion_date
    }

    ESTIMATE {
        string id
        float estimated_cost
        string justification
        date submitted
    }

    AI_SCORE {
        float score
        string risk_level
        string explanation
    }

    ENGINEER {
        string id
        string name
        string department
    }
```

### Implementation Timeline

```mermaid
gantt
    title Assam AI Governance - 6 Month Roadmap
    dateFormat  YYYY-MM
    section Phase 1
    Data Collection & Cleaning     :2026-02, 2M
    Baseline Model Development     :2026-02, 2M
    Basic Portal Development       :2026-03, 1M
    section Phase 2
    AI Engine Deployment           :2026-03, 1M
    Approval Workflow Integration  :2026-04, 1M
    Pilot Testing                  :2026-04, 1M
    section Phase 3
    Full PWD Rollout               :2026-05, 2M
    Model Refinement               :2026-06, 1M
    Expansion Planning             :2026-07, 1M
```

---

## Neo4j Cypher Export

```cypher
// =====================================================
// NODES: Core Entities
// =====================================================

CREATE (initiative:Initiative {
  name: "Assam AI Governance Initiatives",
  version: "1.0",
  date: "2026-02-02",
  owner: "Assam State Government",
  status: "Concept Phase"
})

CREATE (propApp:System {
  name: "Property Registration Digitalization App",
  type: "Digital Service",
  target_processing_days: 7,
  target_remote_completion: 0.80
})

CREATE (costAudit:System {
  name: "Infrastructure Cost Auditing System",
  type: "AI Governance",
  target_savings_crore: 50,
  target_fraud_detection: 0.80
})

// =====================================================
// NODES: Features - Property Registration
// =====================================================

CREATE (f1:Feature {name: "Digital Application", system: "Property Registration"})
CREATE (f2:Feature {name: "AI Document Verification", system: "Property Registration"})
CREATE (f3:Feature {name: "Real-Time Status Dashboard", system: "Property Registration"})
CREATE (f4:Feature {name: "Digital Signature & Approval", system: "Property Registration"})
CREATE (f5:Feature {name: "Data Integration", system: "Property Registration"})

// =====================================================
// NODES: Features - Cost Auditing
// =====================================================

CREATE (f6:Feature {name: "Historical Cost Database", system: "Cost Auditing"})
CREATE (f7:Feature {name: "Estimate Intake & Analysis", system: "Cost Auditing"})
CREATE (f8:Feature {name: "AI Anomaly Detection", system: "Cost Auditing"})
CREATE (f9:Feature {name: "Approval Workflow", system: "Cost Auditing"})
CREATE (f10:Feature {name: "Audit Trail & Accountability", system: "Cost Auditing"})
CREATE (f11:Feature {name: "Post-Project Analysis", system: "Cost Auditing"})

// =====================================================
// NODES: Technologies
// =====================================================

CREATE (t1:Technology {name: "React/Flutter", category: "Frontend"})
CREATE (t2:Technology {name: "Node.js/Python", category: "Backend"})
CREATE (t3:Technology {name: "PostgreSQL", category: "Database"})
CREATE (t4:Technology {name: "Tesseract OCR", category: "AI/ML"})
CREATE (t5:Technology {name: "scikit-learn", category: "AI/ML"})
CREATE (t6:Technology {name: "Isolation Forest", category: "AI/ML"})
CREATE (t7:Technology {name: "AWS/GCP", category: "Infrastructure"})

// =====================================================
// NODES: Stakeholders
// =====================================================

CREATE (s1:Stakeholder {name: "Citizens", role: "End Users"})
CREATE (s2:Stakeholder {name: "PWD Engineers", role: "Estimate Submitters"})
CREATE (s3:Stakeholder {name: "Supervisors", role: "Approvers"})
CREATE (s4:Stakeholder {name: "CM Office", role: "Executive Sponsor"})
CREATE (s5:Stakeholder {name: "Finance Ministry", role: "Budget Authority"})

// =====================================================
// NODES: Risks
// =====================================================

CREATE (r1:Risk {name: "Data Quality", impact: "AI model unreliable", mitigation: "Data audit + cleansing"})
CREATE (r2:Risk {name: "Engineer Resistance", impact: "Low adoption", mitigation: "Transparent rules, appeal mechanism"})
CREATE (r3:Risk {name: "Model Bias", impact: "Legal challenge", mitigation: "Regular model audits"})
CREATE (r4:Risk {name: "False Positives", impact: "Approval delays", mitigation: "Conservative thresholds"})
CREATE (r5:Risk {name: "System Downtime", impact: "Project delays", mitigation: "99.5% SLA + manual fallback"})

// =====================================================
// NODES: Metrics
// =====================================================

CREATE (m1:Metric {name: "Processing Time", current: "20-30 days", target: "5-7 days"})
CREATE (m2:Metric {name: "Remote Completion", current: "0%", target: "80%"})
CREATE (m3:Metric {name: "Fraud Detection Rate", current: "Manual", target: "80%+"})
CREATE (m4:Metric {name: "Annual Savings", current: "0", target: "50+ crore"})
CREATE (m5:Metric {name: "False Positive Rate", target: "<5%"})

// =====================================================
// RELATIONSHIPS
// =====================================================

// Initiative contains systems
CREATE (initiative)-[:INCLUDES]->(propApp)
CREATE (initiative)-[:INCLUDES]->(costAudit)

// Systems have features
CREATE (propApp)-[:HAS_FEATURE]->(f1)
CREATE (propApp)-[:HAS_FEATURE]->(f2)
CREATE (propApp)-[:HAS_FEATURE]->(f3)
CREATE (propApp)-[:HAS_FEATURE]->(f4)
CREATE (propApp)-[:HAS_FEATURE]->(f5)

CREATE (costAudit)-[:HAS_FEATURE]->(f6)
CREATE (costAudit)-[:HAS_FEATURE]->(f7)
CREATE (costAudit)-[:HAS_FEATURE]->(f8)
CREATE (costAudit)-[:HAS_FEATURE]->(f9)
CREATE (costAudit)-[:HAS_FEATURE]->(f10)
CREATE (costAudit)-[:HAS_FEATURE]->(f11)

// Features use technologies
CREATE (f2)-[:USES]->(t4)
CREATE (f8)-[:USES]->(t5)
CREATE (f8)-[:USES]->(t6)
CREATE (propApp)-[:BUILT_WITH]->(t1)
CREATE (propApp)-[:BUILT_WITH]->(t2)
CREATE (propApp)-[:BUILT_WITH]->(t3)
CREATE (costAudit)-[:BUILT_WITH]->(t2)
CREATE (costAudit)-[:BUILT_WITH]->(t3)
CREATE (costAudit)-[:BUILT_WITH]->(t7)

// Stakeholder relationships
CREATE (s1)-[:USES]->(propApp)
CREATE (s2)-[:USES]->(costAudit)
CREATE (s3)-[:APPROVES_IN]->(costAudit)
CREATE (s4)-[:SPONSORS]->(initiative)
CREATE (s5)-[:FUNDS]->(initiative)

// Systems address risks
CREATE (costAudit)-[:ADDRESSES]->(r1)
CREATE (costAudit)-[:ADDRESSES]->(r2)
CREATE (costAudit)-[:ADDRESSES]->(r3)
CREATE (costAudit)-[:ADDRESSES]->(r4)
CREATE (initiative)-[:ADDRESSES]->(r5)

// Systems measure metrics
CREATE (propApp)-[:MEASURES]->(m1)
CREATE (propApp)-[:MEASURES]->(m2)
CREATE (costAudit)-[:MEASURES]->(m3)
CREATE (costAudit)-[:MEASURES]->(m4)
CREATE (costAudit)-[:MEASURES]->(m5)

// Feature dependencies
CREATE (f8)-[:DEPENDS_ON]->(f6)
CREATE (f9)-[:DEPENDS_ON]->(f8)
CREATE (f10)-[:DEPENDS_ON]->(f9)
CREATE (f11)-[:DEPENDS_ON]->(f10)

// Systems enable outcomes
CREATE (propApp)-[:ENABLES]->(m1)
CREATE (propApp)-[:ENABLES]->(m2)
CREATE (costAudit)-[:ENABLES]->(m3)
CREATE (costAudit)-[:ENABLES]->(m4)

// Transformation relationships
CREATE (costAudit)-[:TRANSFORMS {from: "Manual Review", to: "AI-Assisted Flagging"}]->(f8)
CREATE (propApp)-[:TRANSFORMS {from: "Paper-Based", to: "Digital"}]->(f1)
```

---

*Generated using the [Infographic Content Library Skill](https://github.com/mondweep/vibe-cast/tree/claude/infographic-skill-FyqpJ)*
