# Product Requirements Document (PRD)
## NavierStokes Interactive Learning Platform

**Version:** 1.0  
**Date:** 2026-09-09  
**Author:** Development Team  
**Status:** Draft  

---

## Executive Summary

NavierStokes is an interactive, web-based learning platform that demystifies the Navier-Stokes equations through animated scrollytelling, dynamic visualizations, and hands-on computational exploration. The platform transforms abstract mathematical concepts into intuitive visual experiences, making advanced fluid dynamics accessible to learners from secondary education through graduate study.

---

## Problem Statement

### Current State
- The Navier-Stokes equations are notoriously difficult to understand, even for advanced students
- Most educational resources are text-heavy with static diagrams
- Few platforms allow interactive experimentation with fluid dynamics
- The connection between equations and real-world phenomena is often unclear
- Recent claims about "solving" NS equations create confusion about what these equations actually describe

### User Pain Points
1. **Abstraction Gap**: Learners can't visualize what partial differential equations mean in fluid motion
2. **Lack of Interactivity**: Static textbooks don't engage modern learners
3. **Missing Progressive Complexity**: Resources jump from basics to advanced without scaffolding
4. **No Experimentation**: Learners can't modify parameters and see results in real-time
5. **Disconnected Concepts**: Learners don't see how individual equation terms relate to physical phenomena

---

## Vision & Goals

### Primary Vision
Create the world's most engaging, accessible introduction to fluid dynamics through:
- **Narrative Architecture**: A story-driven progression that builds understanding
- **Visual-First Learning**: Animated visualizations precede mathematical formalism
- **Interactive Exploration**: Learners modify parameters and see equations "in action"
- **Rigorous Pedagogy**: London School TDD ensures learning outcomes are testable
- **Accessible Hosting**: Free, cloud-hosted platform removes barriers to access

### Learning Goals (Learner Will Be Able To...)
1. Explain what the Navier-Stokes equations describe and why they matter
2. Understand the physical meaning of each term in the momentum equation
3. Recognize fluid behavior patterns and predict which NS terms dominate
4. Build intuition about turbulence, drag, and flow instability
5. Appreciate why "solving" NS equations remains an open mathematical challenge
6. Apply NS concepts to real-world scenarios (weather, flight, ocean currents)

---

## Target Audience

### Primary Users
1. **Advanced Secondary Students** (age 16-18)
   - Physics/mathematics track students
   - Preparing for university STEM programs
   - Typical session: 20-30 min exploration

2. **Undergraduate Students** (Engineering, Physics, Mathematics)
   - Taking first fluid mechanics course
   - Seeking visual intuition before rigorous coursework
   - Typical session: 45-90 min deep study

3. **Educators** (High School & University)
   - Seeking engaging supplementary material
   - Running interactive demonstrations
   - Building class curriculum

### Secondary Users
- General audiences curious about "that NS equation thing"
- Scientists in non-fluid-dynamics fields wanting foundational knowledge
- Science communicators explaining fluid dynamics to public audiences

---

## Core Learning Architecture

### Module Progression (Narrative Flow)

#### **Module 0: "Why Should You Care?" (5 min)**
- Real-world consequences: weather, flight, ocean dynamics
- Historical context: Navier (1823), Stokes (1845), open problems today
- The famous $1M Millennium Prize problem
- **Visual elements**: Animated video clips of fluid phenomena

#### **Module 1: "Fluids as Continuous Mediums" (10 min)**
- From molecules to continuum mechanics
- What is a fluid element? (infinitesimal "particle" of fluid)
- Velocity fields: describing motion at every point in space
- **Interactive**: Drag to create flows, watch velocity field update
- **Diagram**: Lagrangian vs. Eulerian perspectives (parallax reveal)

#### **Module 2: "Forces & Acceleration (The Momentum Equation Foundation)" (15 min)**
- Newton's 2nd law applied to fluid elements: `ρ(∂u/∂t + u·∇u) = ...`
- Three forces acting on fluid: pressure, viscosity, body forces (gravity)
- **Progressive reveal**: One term at a time with visualization
- **Interactive**: Adjust density/acceleration, see forces rebalance
- **Test**: Predict acceleration given force inputs

#### **Module 3: "Pressure: The Dominant Force" (12 min)**
- What is pressure in fluids?
- Pressure gradients drive flow
- Incompressibility: `∇·u = 0` (conservation of mass)
- **Visual**: Color-coded pressure fields, streamlines following pressure gradients
- **Interactive**: Create pressure differences, watch flow response

#### **Module 4: "Viscosity & Friction" (12 min)**
- Internal friction in fluids: shear stress
- The Newtonian viscosity model: τ = μ(∇u + ∇u^T)
- Why viscosity matters: drag, heat generation, energy dissipation
- **Visual**: Two plates with fluid between, watch shear layer develop
- **Interactive**: Adjust viscosity (oil vs. water vs. honey), feel the resistance

#### **Module 5: "Putting It Together - The Navier-Stokes Equation" (15 min)**
- Complete momentum equation: `ρ(∂u/∂t + u·∇u) = -∇p + μ∇²u + f`
- Meaning of each term in conversational language
- Dimensional analysis: why equation is self-consistent
- **Visual**: Equation appears with annotations, terms light up as used
- **Interactive**: Simulate a cylinder in flow, toggle terms on/off to see their effects

#### **Module 6: "Chaos & Complexity - Turbulence" (15 min)**
- Why simple flows become chaotic
- Reynolds number: the dimensionless ratio that predicts turbulence
- Laminar vs. turbulent regimes
- **Visual**: Animated transition from laminar to turbulent flow (Re sweep)
- **Interactive**: Drag slider to vary Re, watch flow reorganize

#### **Module 7: "Real-World Applications" (10 min)**
- Weather & atmospheric dynamics
- Aircraft aerodynamics
- Ocean circulation & climate
- Industrial flows (pipelines, pumps, reactors)
- **Visual**: Case study videos with overlaid NS equation terms
- **Interactive**: Design an airfoil, simulate flow over it

#### **Module 8: "The Open Problem" (8 min)**
- Smoothness & regularity (existence & uniqueness of solutions)
- Why this matters: numerical simulations, weather prediction, engineering design
- What "solving" Navier-Stokes actually means
- Recent computational progress (not full mathematical proof)
- **Visual**: Timeline of breakthroughs, areas of known solutions

---

## Feature Specifications

### A. Visual Design System
- **Theme**: Dark mode with accent colors (electric blue for velocity, red for pressure, orange for forces)
- **Typography**: Sans-serif (readable at all sizes), equation rendering via MathJax
- **Illustration Style**: Clean line drawings with smooth animations, not photorealistic
- **Accessibility**: High contrast, colorblind-safe palettes, text alternatives for all visualizations

### B. Scrollytelling & Parallax
- Layered backgrounds that move at different speeds
- Triggered animations as learner scrolls past key concepts
- "Sticky" equations that remain visible while narrative flows
- Progressive disclosure: complex ideas revealed gradually as user scrolls
- Smooth transitions between modules with visual continuity

### C. Interactive Simulations
1. **Velocity Field Visualizer**
   - Draw/drag to create velocity fields
   - Visualize as vectors, streamlines, or particle traces
   - Real-time computation of divergence, curl

2. **Pressure-Flow Coupling Simulator**
   - Create pressure gradients
   - Watch flow develop in response
   - Togglable incompressibility constraint

3. **Viscosity Explorer**
   - Adjust fluid viscosity (μ) with slider
   - Watch shear flow response
   - Compare fluids (water, oil, honey, air)

4. **Cylinder Drag Simulator**
   - Adjust Re, watch flow pattern change
   - Toggle viscous/pressure/inertial terms
   - Measure drag coefficient

5. **Airfoil Designer**
   - Sketch airfoil shape
   - Auto-compute flow around it
   - Display lift, drag, pressure distribution

### D. Knowledge Assessment (London School TDD)
**Test Design Philosophy**: Tests reward understanding, not memorization

**Test Types**:
1. **Concept Mapping** (Interactive)
   - Drag equation terms to physical meanings
   - Arrange forces in order of dominance for given scenario
   - Success: 80%+ accuracy expected after each module

2. **Predictive Challenges** (Scenario-based)
   - "If we double the pressure gradient, predict the acceleration"
   - Learner submits prediction, simulation runs, compares
   - Feedback: Why their prediction was right/wrong, which NS term dominated

3. **Parameter Tuning** (Sandbox Mode)
   - Learner receives target flow pattern
   - Adjusts parameters (ρ, μ, pressure, boundary conditions) to match
   - Success: Flow matches target within 5%

4. **Real-World Analysis** (Open-ended)
   - Given scenario (e.g., "blood flow in artery narrowing")
   - Learner explains which NS terms matter most
   - Free-form response, model evaluates depth of understanding

5. **Computational Sketching** (Visualization)
   - Learner sketches expected velocity/pressure field
   - Overlayed on simulation result
   - Scoring: Area overlap, gradient alignment

### E. Learning Paths
- **Express Path** (30 min): Core concepts only (Modules 0, 1, 2, 3, 5, 8)
- **Standard Path** (90 min): All modules in sequence
- **Deep Dive** (3+ hours): Extended simulations, all challenges, application studies
- **Educator Path**: Same content + notes on common misconceptions, timing guides, assessment rubrics

### F. Personalization
- Difficulty adjustment: Beginner/intermediate/advanced simulations
- Pacing: Learner controls module speed; algorithmic timing suggestions
- Transcript saved: Resume learning at any point
- Achievement tracking: Badges for concept mastery, simulation milestones

---

## Technical Architecture (See ADR for Details)

### Tech Stack (Summary)
- **Frontend**: React 19 + TypeScript, Vite
- **Visualization**: Three.js for 3D simulations, D3.js for data viz, Framer Motion for animations
- **Numerical Solvers**: WebAssembly (Rust) for fast 2D NS solving
- **Backend**: Node.js/Express API (light services only)
- **Deployment**: Google Cloud Run (containerized), Cloud Storage for assets
- **Testing**: Jest + React Testing Library (unit), Playwright (e2e)

### Data Model
- **Learning Session**: user_id, module_id, timestamp, interactions_log, assessment_scores
- **Simulation State**: fluid_parameters, boundary_conditions, computed_velocity_field, computed_pressure_field
- **Assessment Result**: test_type, submitted_answer, correctness_score, feedback_generated

---

## Success Metrics

### Learning Outcomes (Primary)
- **Pre/Post Assessment**: 70% average improvement from module start to end
- **Concept Mastery**: 80%+ success rate on concept-mapping tests
- **Real-World Transfer**: Learners can explain NS applications in own words (human eval)

### User Engagement
- **Completion Rate**: 60%+ of learners complete core path (Modules 0-8)
- **Session Duration**: Average 45+ minutes for standard path
- **Return Rate**: 30%+ of users return for second session within 7 days

### Platform Metrics
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Performance**: Core simulations run at 60 FPS on mid-range devices
- **Availability**: 99.5% uptime (measured weekly)
- **Load Time**: < 3 sec first meaningful paint, < 1.5 sec interactive (median devices)

---

## Content Roadmap

### Phase 1 (MVP - Weeks 1-6)
- Modules 0-5 (foundation)
- Cylinder drag simulator
- Basic assessments (concept mapping, predictive)
- Dark mode, accessible design
- Google Cloud hosting setup

### Phase 2 (Enhanced - Weeks 7-10)
- Modules 6-8 (turbulence, applications, open problem)
- Viscosity explorer, pressure-flow simulator
- Advanced assessments (parameter tuning, real-world analysis)
- Learning analytics dashboard

### Phase 3 (Polish & Scale - Weeks 11+)
- Airfoil designer, additional real-world cases
- Educator tools (transcript export, assessment rubrics)
- Multi-language support (Spanish, Mandarin)
- Mobile optimization

---

## Constraints & Assumptions

### Constraints
- **WebAssembly Numerical Limits**: Simulations capped at 2D; 3D requires backend compute
- **Browser Performance**: Real-time simulation limited to grid sizes ~256x256 on mobile
- **Cost**: Google Cloud budget cap $500/month (autoscale limits)
- **Timeline**: 12-week initial development for MVP

### Assumptions
- Users have modern browsers (Chrome, Firefox, Safari, Edge 2022+)
- Users have internet connectivity (simulations don't work offline)
- Target audience has basic calculus knowledge (post-secondary level ideal, secondary advanced acceptable)
- Computational power adequate for 2D simulations (3D via API only in future)

---

## Dependencies & Risks

### External Dependencies
- Three.js, D3.js, Framer Motion ecosystem health
- Google Cloud APIs (stability, pricing)
- MathJax rendering performance at scale

### Key Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Simulation performance on mobile | Users abandon mid-flow | Medium | Responsive simulation resolution, mobile-first testing |
| Math abstraction still too high | Learners don't gain intuition | Medium | Iterative user testing, adjust visualizations |
| Numerical solver instability | Simulations crash or produce nonsense | Medium | Rigorous validation against literature, fallback to precomputed |
| Google Cloud cost overruns | Budget exceeded, service degraded | Low | Auto-scaling limits, CDN caching, load testing |
| Learner dropout after Module 1 | Path completion < 40% | Medium | Engaging narrative, immediate interactivity, progress indicators |

---

## Open Questions / TBD

1. **3D Simulations**: Should Phase 2 include 3D visualization of vortex sheets/turbulent structures?
2. **Real-Time Collaboration**: Multi-user simulations where users see each other's flows?
3. **Assessment Grading**: How to auto-score free-form real-world analysis responses? (LLM eval candidate)
4. **Mobile Experience**: Full feature parity or simplified mobile-first path?
5. **Offline Mode**: Cache modules for offline browsing (no live simulation)?

---

## Glossary
- **Navier-Stokes Equations**: Differential equations governing fluid motion (momentum + mass conservation)
- **Reynolds Number (Re)**: Dimensionless ratio of inertial to viscous forces; predicts laminar vs. turbulent flow
- **Viscosity (μ)**: Internal friction in a fluid; resistance to flow
- **Pressure Gradient (∇p)**: Direction & magnitude of pressure change
- **Turbulence**: Chaotic, three-dimensional fluid motion with energy cascade across scales
- **Euler Equations**: Special case of NS where viscosity is neglected (μ=0)
- **Boundary Conditions**: Constraints on flow at domain edges (no-slip, free-slip, inlet/outlet)

---

## Approval Sign-Off
- **Product Manager**: [Pending]
- **Lead Engineer**: [Pending]
- **Subject Matter Expert (Fluid Dynamics)**: [Pending]
