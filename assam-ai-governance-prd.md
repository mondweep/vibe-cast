# PRD: Assam AI Governance Initiatives

**Version:** 1.0  
**Date:** 2 February 2026  
**Owner:** Assam State Government  
**Status:** Concept Phase  

---

## Executive Summary

Two interconnected AI governance projects to digitalize government services and reduce corruption in infrastructure spending:

1. **Property Registration Digitalization** — Remote registration app for flat/property transactions
2. **Infrastructure Cost Auditing System** — AI-powered estimate validation to prevent cost inflation

**Expected Impact:**
- Reduce government processing time by 60%+
- Prevent infrastructure fraud (currently ₹4+ crore in overruns per large project)
- Increase citizen trust through transparency

---

## Part 1: Property Registration Digitalization App

### 1.1 Problem Statement

**Current State:**
- Citizens must visit government offices to register property transactions
- Multiple office visits required (documentation review, verification, final registration)
- Average processing time: 20-30 days
- Paper-based: Lost files, manual verification errors, corruption opportunities

**Target State:**
- Citizens register online from home
- AI-assisted document verification
- Real-time status tracking
- Processing time: 5-7 days

---

### 1.2 Product Goals

| Goal | Success Metric | Timeline |
|------|----------------|----------|
| Reduce office visits | 80% of users complete registration remotely | Month 3 |
| Faster processing | Average 7-day turnaround | Month 3 |
| Reduce manual errors | 95% accuracy in document verification | Month 6 |
| Citizen satisfaction | NPS > 60 | Month 6 |

---

### 1.3 Scope (Phase 1)

**In Scope:**
- Flat/apartment registration only (per CM directive)
- State of Assam jurisdiction
- Hindi + Assamese language support
- Web + mobile app

**Out of Scope (Phase 2+):**
- Land/property outside flats
- Divorce settlements, inheritance disputes
- Other states/national integration

---

### 1.4 Core Features

#### Feature 1.1: Digital Application
- Users upload property documents (deed, tax receipts, ID proofs)
- Buyer + seller info (both must verify)
- Property details (location, area, price)
- Payment integration (government fee)

#### Feature 1.2: AI Document Verification
- Optical character recognition (OCR) for documents
- Cross-reference with:
  - Existing property registry database
  - Tax records (DVAT, property tax)
  - Identification databases
- Flag anomalies for manual review

#### Feature 1.3: Real-Time Status Dashboard
- Application status tracking
- Document verification progress
- Estimated completion date
- Push notifications for user actions needed

#### Feature 1.4: Digital Signature & Approval
- Electronic signature integration (eSign as per Indian law)
- Digital certificate generation
- Downloadable registration certificate

#### Feature 1.5: Data Integration
- API integration with state land revenue database
- Tax authority data sync
- Police verification database access

---

### 1.5 Technical Architecture

**Frontend:**
- Web app: React/Vue (responsive, accessible)
- Mobile app: React Native or Flutter
- Real-time status: WebSocket updates

**Backend:**
- API: Node.js/Python (RESTful or GraphQL)
- Database: PostgreSQL (transactional integrity)
- Document Processing: Tesseract OCR + custom CV models
- Verification Engine: Rule-based + ML models

**AI/ML Components:**
- Document classification (deed vs. tax receipt vs. ID proof)
- Entity extraction (property address, owner names, dates)
- Anomaly detection (flag suspicious registrations)
- Data quality scoring (confidence levels per field)

**Infrastructure:**
- Cloud hosting (AWS/GCP on Indian servers for compliance)
- 99.5% uptime SLA
- End-to-end encryption for PII

---

### 1.6 Data Requirements

**Inputs:**
- State property registry (historical data for cross-reference)
- Tax authority database (property tax, DVAT records)
- Identification databases (voter ID, Aadhaar mappings)
- Police verification records

**Processing:**
- OCR training data (sample property documents, ~1000 samples)
- Anomaly detection patterns (historical registration fraud cases)

**Outputs:**
- Verified registrations stored in state database
- Digital certificates
- Audit logs for compliance

---

### 1.7 Success Metrics

- **Adoption:** 50% of eligible users register digitally within 6 months
- **Processing time:** Median 7 days (vs. 20-30 currently)
- **Document accuracy:** 95%+ AI verification accuracy
- **Citizen satisfaction:** NPS > 60
- **Cost savings:** ₹X crore annually (reduced office overhead)

---

## Part 2: Infrastructure Cost Auditing System (AI Governance)

### 2.1 Problem Statement

**Current State:**
- Public Works engineers submit cost estimates with significant inflation
- Real example: ₹2 crore project → ₹6-7 crore estimate (3x markup)
- No automated validation before approval
- Budget overruns drain state resources, delay projects

**Root Causes:**
- Limited historical cost data for comparison
- Manual approval process (no audit trail)
- Weak accountability
- Engineer incentives misaligned with government savings

**Target State:**
- Every estimate cross-checked against historical data + market rates
- Anomalies flagged automatically for review
- Transparent justification required for above-baseline estimates
- AI makes final flagging, humans make approval decisions

---

### 2.2 Product Goals

| Goal | Success Metric | Timeline |
|------|----------------|----------|
| Catch inflated estimates | Flag 80%+ of suspicious estimates | Month 2 |
| Cost savings | Save ₹50+ crore/year on inflated contracts | Month 6 |
| Engineer accountability | 100% audit trail for all estimates | Month 1 |
| Faster approvals | Average approval time < 5 days | Month 3 |
| Prevent fraud | Zero estimates > 2x baseline cost approved | Ongoing |

---

### 2.3 Scope (Phase 1)

**In Scope:**
- Road construction projects (largest fraud vector, per CM)
- Assam Public Works Department (PWD)
- Projects ₹50 lakh+

**Out of Scope (Phase 2+):**
- Building construction, water/sanitation projects
- Private sector projects
- Projects < ₹50 lakh (higher fraud risk, but lower impact)

---

### 2.4 Core Features

#### Feature 2.1: Historical Cost Database
- Ingest historical road projects (5+ years)
- Normalize data: Cost per km, cost per lane, cost per surface type
- Track inflation adjustments over time
- Flag historical outliers

**Data Model:**
```
Project:
  - ID, Name, Location
  - Type (2-lane asphalt, 4-lane concrete, etc.)
  - Length (km), Width (m)
  - Actual cost (₹), Estimated cost (₹)
  - Bid date, completion date
  - Surface quality (as-built inspection)
  - Historical comparison metrics
```

#### Feature 2.2: Estimate Intake & Analysis
- Engineers submit estimate with:
  - Project specs (length, width, surface type, location)
  - Material costs (asphalt, concrete, labor rates)
  - Timeline
  - Justification for any above-baseline costs

#### Feature 2.3: AI Anomaly Detection
- **Baseline calculation:**
  - Historical median cost per km for similar projects
  - Adjust for: Location, terrain, current material prices
  - Build confidence intervals (acceptable range)

- **Estimate scoring:**
  - Calculate: Estimated cost / Baseline cost
  - Flag if > 1.5x baseline (automated)
  - Flag if > 2x baseline (urgent review required)
  - Classify risk: Green / Yellow / Red

- **Explainability:**
  - Show similar historical projects
  - Explain why estimate is high/low
  - Highlight suspicious line items

#### Feature 2.4: Approval Workflow
- **Green (< 1.2x baseline):** Auto-approve with notification
- **Yellow (1.2x - 1.5x baseline):** Require engineer justification + supervisor review
- **Red (> 1.5x baseline):** Require executive sign-off + investigation trigger

#### Feature 2.5: Audit Trail & Accountability
- Every estimate decision logged:
  - Who submitted, when
  - AI score + reasoning
  - Who approved, when, notes
  - Actual project cost (post-completion comparison)

#### Feature 2.6: Post-Project Analysis
- Compare estimated vs. actual costs
- Retrain AI model monthly with new data
- Identify engineers with systematic overestimation (disciplinary action)
- Identify realistic vs. inflated cost patterns

---

### 2.5 Technical Architecture

**Frontend:**
- Estimate submission portal (web)
- Dashboard: Pending approvals, flagged estimates, trends
- Reports: Savings by department, engineer performance

**Backend:**
- Estimate intake service
- AI scoring engine (Python, scikit-learn or TensorFlow)
- Database: PostgreSQL
- Audit logging service

**AI/ML Components:**
- **Regression model:** Predict baseline cost given project specs
- **Anomaly detection:** Isolation Forest or custom rules
- **Time-series analysis:** Track price inflation (materials, labor)
- **Pattern detection:** Identify individual engineer bias

**Data Pipeline:**
- ETL to ingest historical project data
- Monthly retraining with new actual project costs
- Data quality checks (outliers, missing values)

---

### 2.6 Data Requirements

**Essential Data:**
- Historical projects (5+ years):
  - Estimates submitted + actual costs
  - Project specs (length, width, surface type)
  - Materials used + quantities
  - Labor costs + duration
  - Completion date + quality inspection

- Material prices:
  - Historical asphalt prices (per ton)
  - Concrete prices
  - Labor rates (per day)
  - Fuel + transport costs

**Optional Data (for better modeling):**
- Terrain difficulty (geographic data)
- Weather impact (rainfall, temperature)
- Supply chain disruptions
- Engineer qualifications + experience

---

### 2.7 Implementation Approach

**Phase 1 (Month 1-2): Setup**
1. Data collection: Mine historical projects from PWD records
2. Data cleaning + normalization
3. Build baseline cost model
4. Estimate intake portal (basic version)

**Phase 2 (Month 2-3): AI Integration**
1. Deploy anomaly detection engine
2. Approval workflow integration
3. Testing with pilot projects
4. Engineer training

**Phase 3 (Month 3-6): Scale + Refine**
1. Roll out to all PWD projects > ₹50 lakh
2. Collect actual project data for model refinement
3. Identify high-risk engineers (optional disciplinary process)
4. Expand to other project types

---

### 2.8 Success Metrics

- **Fraud prevention:** Anomalies flagged before approval (100%)
- **Cost savings:** Compare total saved by flagging inflated estimates
- **False positive rate:** Flag rate < 5% (don't overwhelm approvers)
- **Approval time:** < 5 days average (vs. 10-20 currently)
- **Model accuracy:** Predicted vs. actual cost within ±15%
- **User adoption:** 100% engineer compliance

---

## Part 3: Integration & Governance

### 3.1 Data Privacy & Security

- Encrypted storage (AES-256)
- Role-based access control (RBAC)
- Audit logs (immutable)
- Compliance: Indian IT Act, GST regulations, RTI requirements

### 3.2 Change Management

- Engineer training (how AI scoring works, appeal process)
- Stakeholder buy-in (PWD leadership, finance ministry)
- Transparent rules: Publish baseline cost calculations
- Grievance mechanism: Engineers can appeal flagged estimates

### 3.3 Scaling Strategy

**Timeline:**
- Month 1-2: Setup + pilot
- Month 3-6: Full rollout (roads only)
- Month 6+: Expand to water, sanitation, buildings

**Success Criteria for Expansion:**
- ₹50+ crore saved in Year 1
- < 2% false positive rate
- > 80% stakeholder satisfaction

---

## Part 4: Resource & Budget Estimate

### 4.1 Team (2-Year engagement)

**Core Team:**
- 1 Product Manager (government liaison)
- 1 Tech Lead (architecture, database)
- 3 Full-stack developers
- 1 Data engineer (ETL, model training)
- 1 ML engineer (anomaly detection models)
- 1 QA/Tester
- 1 DevOps/Infrastructure

**Part-time:**
- Legal/compliance advisor (data privacy)
- Change management consultant
- Domain expert (PWD engineer, construction cost analyst)

**Total:** ~9 FTE, ~₹2-3 crore/year for talent

### 4.2 Budget Breakdown (Estimated)

| Component | Cost (₹) | Notes |
|-----------|----------|-------|
| Development team | 2.0 crore | 2-year engagement |
| Cloud infrastructure | 30 lakh | AWS/GCP, 2-year |
| Data collection/cleaning | 20 lakh | Historical project data mining |
| Training + change mgmt | 15 lakh | Engineer onboarding |
| Contingency (20%) | 55 lakh | Buffer for overruns |
| **Total** | **3.2 crore** | **2-year delivery** |

**Cost-Benefit:**
- Year 1 savings: ₹50+ crore (fraud prevention)
- Payback period: **~2 months**

---

## Part 5: Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data quality (bad historical data) | AI model unreliable | Data audit + cleansing; manual validation for first 100 estimates |
| Engineer resistance | Low adoption, continued fraud | Transparent rules, appeal mechanism, gradual rollout |
| Model bias (favors certain engineers) | Legal challenge | Regular model audits, explainability reporting |
| False positives (legitimate estimates flagged) | Approval delays | Tune thresholds; start conservative (1.8x baseline), tighten over time |
| System downtime during approval | Project delays | 99.5% SLA; fallback manual process |
| Privacy concerns (engineer monitoring) | Public backlash | Limit audit visibility; focus on project-level data, not individual tracking |

---

## Part 6: Success Definition (6-Month Checkpoint)

**Go / No-Go Criteria:**

✅ **GO if:**
- Fraud prevention rate > 75%
- Cost savings > ₹30 crore verified
- False positive rate < 5%
- Engineer satisfaction > 50% (neutral to positive)
- System uptime > 99%

❌ **NO-GO if:**
- Model accuracy < 70% (predictions way off)
- High false positive rate (> 10%, frustrating users)
- Major security breach
- < ₹10 crore savings (not worth the complexity)

---

## Next Steps

1. **Stakeholder alignment** — Present PRD to CM office, PWD leadership, finance ministry
2. **Data audit** — Assess quality of historical project data
3. **Vendor selection** — RFP for development partner (or internal team)
4. **Pilot design** — Select 10-20 projects for pilot phase
5. **Timeline finalization** — Confirm 6-12 month delivery plan

---

**Prepared by:** Maina (AI Assistant)  
**For:** Assam State Government  
**Distribution:** CM Office, PWD, Finance Ministry, IT Department
