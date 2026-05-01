# Product Requirements Document (PRD)

**Product Name:** EV Repair Network Navigator
**Version:** 1.0 – Prototype for Chief Technical Strategy Officer Application
**Date:** May 2026
**Author:** Mondweep Chakravorty – Candidate for Chief Technical Strategy Officer

## 1. Product Vision & Purpose

This prototype application demonstrates hands-on technical architecture leadership and strategic vision for modernising a nationwide vehicle repair network in the EV and ADAS era.

The app serves as a live technical artefact proving that the candidate can:

- Architect scalable digital solutions for a physical repair ecosystem
- Deeply integrate OEM standards, BSI, and ATA guidelines
- Define training, capability, and processes across a nationwide footprint
- Own the technical roadmap for transitioning the network into the digital and electric age

It positions the candidate as the primary technical voice to OEMs and industry bodies.

## 2. Business Context (Aligned to Client Requirement)

The client operates one of the UK's most sophisticated vehicle repair networks. They require a technical leader who can:

- Ensure the repair network remains the gold standard as vehicle technology evolves
- Influence OEMs on safe and efficient repair practices at scale
- Define "how" for training, capability building, and standardised processes nationwide
- Future-proof the network for full EV and ADAS integration

## 3. Prototype Objectives

- Showcase deep domain knowledge in OEM standards, EV/ADAS integration, and industry policy (BSI PAS 1025, ATA guidelines)
- Demonstrate practical architectural decisions for a real-world repair network platform
- Illustrate how technical strategy translates into scalable, compliant systems
- Provide a tangible demo that can be walked through in an interview to highlight strategic and execution capability

## 4. Tech Stack (Architectural Decisions)

- **Frontend:** React Native (cross-platform mobile experience)
- **Mapping:** MapLibre + OpenStreetMap (free, scalable, nationwide coverage suitable for prototype and future production)
- **Backend & Database:** Supabase (Postgres-based) – chosen for strong relational integrity, real-time capabilities, built-in auth, and edge functions
- **Serverless Logic:** Supabase Edge Functions (Node.js/TypeScript)
- **Documentation:** Architectural Decision Records (ADRs) stored in Git repository

Key ADRs to be included in the repo:

- Choice of Supabase/Postgres over MongoDB for data consistency in safety-critical repair records
- Use of free mapping stack to enable rapid nationwide prototyping without commercial constraints
- Modular design to support future OEM-specific integrations and compliance reporting

## 5. Phase-Wise Roadmap

### Phase 1: Core MVP (Recruiter Demo Ready – 2–3 weeks)

- User authentication via Supabase
- Interactive nationwide map (MapLibre + OSM) showing repair network locations
- Search and filter for certified repair centres
- Basic EV route planning with range awareness and nearest compliant repair suggestion
- Simple "Demo Mode" dashboard explaining the architecture and key decisions
- Core data model for repair facilities including compliance tags (BSI PAS 1025, ATA, OEM-specific approvals)

### Phase 2: Real-time & Training Capabilities

- Real-time availability and technician scheduling indicators
- Nationwide training & capability module (modular content delivery for technicians)
- Process standardization workflows aligned with industry policy
- Notifications and real-time updates using Supabase subscriptions

### Phase 3: OEM Integration & Future-Proofing (Gold Standard)

- Detailed compliance engine:
  - BSI PAS 1025 repair standards tracking
  - ATA guidelines adherence
  - OEM-specific ADAS calibration capabilities and procedures
  - EV battery diagnostics and repair protocols
- ADAS sensor calibration workflow and documentation
- OEM integration layer (API hooks and data sync patterns)
- Technical roadmap visualisation for digital/EV transition
- Reporting dashboard for network-wide compliance and capability metrics

## 6. Key Demonstration Features (What the Recruiter / Client Will See)

- Live map with geolocated, standards-certified repair network
- Scenario simulation: Low-range EV route → suggests nearest BSI/ATA/OEM-approved repair or calibration centre
- Filter by OEM make, ADAS capabilities, or specific standards
- Walkthrough of the architecture, ADRs, and Supabase schema
- Training capability mockup showing how standardised processes and knowledge are delivered nationwide
- Clear articulation of how this platform ensures the repair network remains the gold standard

## 7. Non-Functional & Strategic Aspects

- Emphasis on data integrity and auditability for safety-critical repair information
- Scalable architecture ready for nationwide rollout
- Clear separation of concerns to support both operational use and strategic oversight
- Design that facilitates influence with OEMs (clean APIs, compliance transparency)
